import { NextRequest, NextResponse } from "next/server";
import { getMangaDexRequestHeaders, toMangaDexApiUrl } from "../../../utils/mangadex-config";

export const revalidate = 3600;

type SupportedLanguage = "es" | "en" | "pt";

type ChapterFeedItem = {
  id: string;
  attributes?: {
    chapter?: string | null;
    title?: string | null;
    translatedLanguage?: string | null;
  };
};

type ChapterFeedResponse = {
  data?: ChapterFeedItem[];
  total?: number;
  limit?: number;
  offset?: number;
};

type MangaDetailsResponse = {
  data?: {
    attributes?: {
      title?: Record<string, string>;
    };
  };
};

type AtHomeResponse = {
  baseUrl: string;
  chapter: {
    hash: string;
    data: string[];
  };
};

const RETRY_DELAY_MS = 1200;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getLanguageVariants(lang: SupportedLanguage) {
  if (lang === "es") return ["es-la", "es"];
  if (lang === "pt") return ["pt-br", "pt"];
  return ["en"];
}

function normalizeLanguage(value: string | null): SupportedLanguage {
  if (value === "en" || value === "pt") return value;
  return "es";
}

async function fetchMangaDex(url: string, init?: RequestInit, retries = 1) {
  const response = await fetch(toMangaDexApiUrl(url), {
    ...init,
    headers: {
      ...getMangaDexRequestHeaders(),
      ...init?.headers,
    },
    next: { revalidate: 3600 },
  });

  if (response.status === 429 && retries > 0) {
    const retryAfter = Number(response.headers.get("retry-after"));
    await wait(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : RETRY_DELAY_MS);
    return fetchMangaDex(url, init, retries - 1);
  }

  return response;
}

function buildFeedUrl(mangaId: string, lang: SupportedLanguage, limit: number, offset: number) {
  const search = new URLSearchParams();

  getLanguageVariants(lang).forEach((variant) => {
    search.append("translatedLanguage[]", variant);
  });

  search.set("order[chapter]", "asc");
  search.set("limit", String(limit));
  search.set("offset", String(offset));

  return `https://api.mangadex.org/manga/${mangaId}/feed?${search.toString()}`;
}

async function fetchMangaTitle(mangaId: string) {
  const response = await fetchMangaDex(`https://api.mangadex.org/manga/${mangaId}`);

  if (!response.ok) return "Mangastoon";

  const payload = (await response.json()) as MangaDetailsResponse;
  const titles = payload.data?.attributes?.title ?? {};

  return titles.en ?? titles.es ?? titles["es-la"] ?? titles.pt ?? Object.values(titles)[0] ?? "Mangastoon";
}

async function fetchAllChapters(mangaId: string, lang: SupportedLanguage) {
  const limit = 100;
  let offset = 0;
  let total = 0;
  const chapters: ChapterFeedItem[] = [];

  do {
    const response = await fetchMangaDex(buildFeedUrl(mangaId, lang, limit, offset));

    if (!response.ok) {
      throw new Error(response.status === 429 ? "RATE_LIMIT" : "CHAPTER_FEED_FAILED");
    }

    const payload = (await response.json()) as ChapterFeedResponse;
    const batch = payload.data ?? [];
    total = payload.total ?? batch.length;
    chapters.push(...batch);
    offset += payload.limit ?? limit;
  } while (offset < total);

  return chapters;
}

async function fetchChapterPages(chapterId: string) {
  const response = await fetchMangaDex(`https://api.mangadex.org/at-home/server/${chapterId}`);

  if (!response.ok) {
    throw new Error(response.status === 429 ? "RATE_LIMIT" : "AT_HOME_FAILED");
  }

  const payload = (await response.json()) as AtHomeResponse;
  const hash = payload.chapter?.hash;
  const files = payload.chapter?.data ?? [];

  if (!payload.baseUrl || !hash || files.length === 0) return [];

  return files.map((filename) => `${payload.baseUrl}/data/${hash}/${filename}`);
}

async function fetchChapterDetails(chapterId: string) {
  const response = await fetchMangaDex(`https://api.mangadex.org/chapter/${chapterId}`);

  if (!response.ok) return null;

  const payload = (await response.json()) as { data?: ChapterFeedItem };
  return payload.data ?? null;
}

async function findChapterByNumber(
  mangaId: string,
  lang: SupportedLanguage,
  chapterNumber: string | null | undefined
) {
  if (!chapterNumber) return null;

  const search = new URLSearchParams();
  getLanguageVariants(lang).forEach((variant) => {
    search.append("translatedLanguage[]", variant);
  });
  search.set("chapter", chapterNumber);
  search.set("limit", "1");

  const response = await fetchMangaDex(`https://api.mangadex.org/manga/${mangaId}/feed?${search.toString()}`);

  if (!response.ok) return null;

  const payload = (await response.json()) as ChapterFeedResponse;
  return payload.data?.[0] ?? null;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lang = normalizeLanguage(request.nextUrl.searchParams.get("lang"));
  const chapterId = request.nextUrl.searchParams.get("chapter");

  try {
    const [mangaTitle, chapters, requestedChapter] = await Promise.all([
      fetchMangaTitle(id),
      fetchAllChapters(id, lang),
      chapterId ? fetchChapterDetails(chapterId) : Promise.resolve(null),
    ]);

    let currentChapter = chapters.find((chapter) => chapter.id === chapterId) ?? null;

    if (!currentChapter && requestedChapter?.attributes?.chapter) {
      currentChapter = await findChapterByNumber(id, lang, requestedChapter.attributes.chapter);
    }

    let englishFallbackChapter: ChapterFeedItem | null = null;
    let fallbackReason: "english" | "unavailable" | null = null;

    if (!currentChapter && chapterId && requestedChapter) {
      englishFallbackChapter = await findChapterByNumber(id, "en", requestedChapter.attributes?.chapter);
      fallbackReason = englishFallbackChapter ? "english" : "unavailable";

      return NextResponse.json(
        {
          mangaTitle,
          chapters,
          currentChapter: requestedChapter,
          pages: [],
          englishFallbackChapter,
          fallbackReason,
        },
        { headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400" } }
      );
    }

    currentChapter = currentChapter ?? chapters[0] ?? null;
    const pages = currentChapter ? await fetchChapterPages(currentChapter.id) : [];

    return NextResponse.json(
      { mangaTitle, chapters, currentChapter, pages, englishFallbackChapter: null, fallbackReason: null },
      { headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400" } }
    );
  } catch (error) {
    const isRateLimit = error instanceof Error && error.message === "RATE_LIMIT";

    return NextResponse.json(
      {
        error: isRateLimit ? "Servidor ocupado, reintentando..." : "No pudimos conectar con MangaDex.",
        code: isRateLimit ? "RATE_LIMIT" : "MANGADEX_UNAVAILABLE",
      },
      {
        status: isRateLimit ? 429 : 503,
        headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=86400" },
      }
    );
  }
}

import Link from "next/link";
import Script from "next/script";
import { headers } from "next/headers";
import { ArrowLeft, ArrowRight, BookOpen, List } from "lucide-react";
import { SITE_NAME, absoluteUrl } from "../../utils/seo";

type SupportedLanguage = "es" | "en" | "pt";

type ChapterFeedItem = {
  id: string;
  attributes?: {
    chapter?: string | null;
    title?: string | null;
    translatedLanguage?: string | null;
  };
};

type ReaderApiResponse = {
  mangaTitle?: string;
  coverImage?: string;
  chapters?: ChapterFeedItem[];
  currentChapter?: ChapterFeedItem | null;
  pages?: string[];
  englishFallbackChapter?: ChapterFeedItem | null;
  fallbackReason?: "english" | "unavailable" | null;
  error?: string;
  code?: string;
};

const UI_COPY: Record<SupportedLanguage, {
  backHome: string;
  chapterList: string;
  previousChapter: string;
  nextChapter: string;
  chapterUnavailable: string;
  noPages: string;
  page: string;
}> = {
  es: {
    backHome: "Inicio",
    chapterList: "Lista de capítulos",
    previousChapter: "Capítulo anterior",
    nextChapter: "Siguiente capítulo",
    chapterUnavailable: "Capítulo no disponible",
    noPages: "No pudimos cargar las páginas de este capítulo.",
    page: "Página",
  },
  en: {
    backHome: "Home",
    chapterList: "Chapter list",
    previousChapter: "Previous chapter",
    nextChapter: "Next chapter",
    chapterUnavailable: "Chapter unavailable",
    noPages: "We could not load this chapter pages.",
    page: "Page",
  },
  pt: {
    backHome: "Início",
    chapterList: "Lista de capítulos",
    previousChapter: "Capítulo anterior",
    nextChapter: "Próximo capítulo",
    chapterUnavailable: "Capítulo indisponível",
    noPages: "Não foi possível carregar as páginas deste capítulo.",
    page: "Página",
  },
};

function getRequestBaseUrl(headersList: Headers) {
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host") ?? "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

function normalizeLanguage(value: string | undefined): SupportedLanguage {
  if (value === "en" || value === "pt") return value;
  return "es";
}

function getChapterNumber(chapter: ChapterFeedItem | null | undefined) {
  return chapter?.attributes?.chapter?.trim() || chapter?.attributes?.title?.trim() || "";
}

function getChapterLabel(chapter: ChapterFeedItem | null | undefined, fallback = "Capítulo") {
  const number = getChapterNumber(chapter);
  return number ? `Capítulo ${number}` : fallback;
}

function parseChapterNumber(chapter: ChapterFeedItem | null | undefined) {
  const raw = getChapterNumber(chapter);
  if (!raw) return null;
  const parsed = Number.parseFloat(raw.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function findChapterByDelta(chapters: ChapterFeedItem[], current: ChapterFeedItem | null | undefined, delta: number) {
  const currentNumber = parseChapterNumber(current);
  if (currentNumber === null) return null;

  return chapters.find((chapter) => {
    const number = parseChapterNumber(chapter);
    return number !== null && Math.abs(number - (currentNumber + delta)) < 0.0001;
  }) ?? null;
}

function buildReaderUrl(mangaId: string, chapterId: string, lang: SupportedLanguage) {
  const search = new URLSearchParams();
  search.set("chapter", chapterId);
  if (lang !== "es") search.set("lang", lang);
  return `/read/${mangaId}?${search.toString()}`;
}

async function fetchReaderData({
  id,
  chapter,
  lang,
}: {
  id: string;
  chapter?: string;
  lang: SupportedLanguage;
}) {
  const headersList = await headers();
  const url = new URL(`/api/read/${encodeURIComponent(id)}`, getRequestBaseUrl(headersList));
  url.searchParams.set("lang", lang);
  if (chapter) url.searchParams.set("chapter", chapter);

  try {
    const response = await fetch(url.toString(), {
      cache: "no-store",
      headers: {
        cookie: headersList.get("cookie") ?? "",
      },
    });

    return (await response.json()) as ReaderApiResponse;
  } catch {
    return null;
  }
}

export default async function ReadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ chapter?: string; lang?: string }>;
}) {
  const [{ id }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const lang = normalizeLanguage(resolvedSearchParams.lang);
  const copy = UI_COPY[lang];
  const data = await fetchReaderData({ id, chapter: resolvedSearchParams.chapter, lang });
  const mangaTitle = data?.mangaTitle || SITE_NAME;
  const chapters = data?.chapters ?? [];
  const currentChapter = data?.currentChapter ?? null;
  const pages = data?.pages ?? [];
  const previousChapter = findChapterByDelta(chapters, currentChapter, -1);
  const nextChapter = findChapterByDelta(chapters, currentChapter, 1);
  const currentLabel = getChapterLabel(currentChapter, copy.chapterUnavailable);
  const canonical = absoluteUrl(`/read/${id}${resolvedSearchParams.chapter ? `?chapter=${resolvedSearchParams.chapter}` : ""}`);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Chapter",
    name: `${mangaTitle} - ${currentLabel}`,
    isPartOf: {
      "@type": "Book",
      name: mangaTitle,
      url: absoluteUrl(`/manga/${id}`),
    },
    url: canonical,
    inLanguage: lang,
    isAccessibleForFree: true,
  };

  return (
    <main className="min-h-screen bg-[#0a0a0c] px-4 pb-10 pt-2 text-white sm:px-4 md:px-6 md:pt-3">
      <Script id="reader-chapter-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="mx-auto max-w-5xl pt-0">
        <div className="mb-2 flex w-full items-center justify-between px-1 sm:px-2 md:px-4">
          <Link href="/" className="flex min-h-10 items-center gap-2 rounded-full bg-[#1a1b20] px-4 py-2 text-sm font-semibold text-gray-300 shadow-lg shadow-black/20 transition-all hover:bg-[#ff6b00] hover:text-white">
            <ArrowLeft size={24} />
            <span className="hidden font-medium sm:inline">{copy.backHome}</span>
          </Link>

          <Link href={`/manga/${id}#chapters`} className="flex min-h-10 items-center gap-2 rounded-full bg-[#1a1b20] px-4 py-2 text-sm font-semibold text-gray-300 shadow-lg shadow-black/20 transition-all hover:bg-[#ff6b00] hover:text-white">
            <List size={22} />
            <span className="hidden font-medium sm:inline">{copy.chapterList}</span>
          </Link>
        </div>

        <div className="mb-2 flex flex-col items-center justify-center px-3 text-center">
          <h1 className="mb-1 max-w-3xl hyphens-auto text-xl font-semibold leading-tight tracking-tight text-orange-500 md:text-2xl">
            {mangaTitle}
          </h1>
          <h2 className="text-base font-semibold text-white">{currentLabel}</h2>
        </div>

        <nav className="my-4 flex flex-wrap items-center justify-center gap-3 md:my-5 md:gap-4" aria-label="Navegación de capítulos">
          {previousChapter ? (
            <Link href={buildReaderUrl(id, previousChapter.id, lang)} className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-800 text-gray-300 transition-all hover:border-orange-500/50 hover:text-white" aria-label={copy.previousChapter}>
              <ArrowLeft aria-hidden="true" size={24} strokeWidth={2.6} />
            </Link>
          ) : null}

          <Link href={`/manga/${id}#chapters`} className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-800 text-gray-300 transition-all hover:border-orange-500/50 hover:text-white" aria-label={copy.chapterList}>
            <BookOpen aria-hidden="true" size={24} strokeWidth={2.6} />
          </Link>

          {nextChapter ? (
            <Link href={buildReaderUrl(id, nextChapter.id, lang)} className="flex h-12 w-12 items-center justify-center rounded-full border border-orange-500/50 bg-orange-600 text-white transition-all hover:bg-orange-500" aria-label={copy.nextChapter}>
              <ArrowRight aria-hidden="true" size={24} strokeWidth={2.6} />
            </Link>
          ) : null}
        </nav>
      </section>

      {data?.error || data?.fallbackReason || pages.length === 0 ? (
        <section className="flex min-h-[38vh] items-center justify-center px-1">
          <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-neutral-900/50 p-6 text-center sm:p-8">
            <h2 className="text-2xl font-semibold text-white">{copy.chapterUnavailable}</h2>
            <p className="mt-4 text-sm leading-7 text-gray-400">{data?.error || copy.noPages}</p>
          </div>
        </section>
      ) : (
        <section className="pb-0 pt-0">
          <div className="mx-auto flex w-full max-w-3xl flex-col">
            {pages.map((pageUrl, index) => (
              <img
                key={`${pageUrl}-${index}`}
                src={pageUrl}
                alt={`${copy.page} ${index + 1} · ${currentLabel}`}
                className="block h-auto w-full bg-[#111217]"
                loading={index < 2 ? "eager" : "lazy"}
                fetchPriority={index < 2 ? "high" : "low"}
                decoding="async"
                referrerPolicy="no-referrer"
              />
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-5xl px-4">
        {nextChapter ? (
          <div className="mb-20 mt-10 flex items-center justify-center gap-6">
            <Link href={buildReaderUrl(id, nextChapter.id, lang)} className="flex items-center gap-3 rounded-full bg-orange-600 px-6 py-3 text-white shadow-lg transition-transform hover:scale-105 hover:bg-orange-500">
              <span className="text-sm font-bold">{copy.nextChapter} · {getChapterLabel(nextChapter)}</span>
              <ArrowRight aria-hidden="true" className="h-5 w-5" />
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}

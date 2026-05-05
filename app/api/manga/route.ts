import { NextRequest, NextResponse } from "next/server";

const JIKAN_BASE_URL = "https://api.jikan.moe/v4/manga";
const MANGADEX_BASE_URL = "https://api.mangadex.org/manga";

type JikanResponse = {
  data?: Array<{
    mal_id: number;
    title: string;
    synopsis: string | null;
    images?: {
      webp?: { large_image_url?: string | null; image_url?: string | null };
      jpg?: { large_image_url?: string | null; image_url?: string | null };
    };
  }>;
};

type JikanManga = NonNullable<JikanResponse["data"]>[number];

type MangaDexResponse = {
  data?: Array<{
    id: string;
  }>;
};

function normalizeSynopsis(value: string | null | undefined) {
  if (!value) return "No synopsis available.";
  return value.replace(/\[Written by MAL Rewrite\]/g, "").trim();
}

function getBestCoverUrl(manga: JikanManga) {
  return (
    manga.images?.webp?.large_image_url ??
    manga.images?.jpg?.large_image_url ??
    manga.images?.webp?.image_url ??
    manga.images?.jpg?.image_url ??
    null
  );
}

async function fetchFromJikan(search: string) {
  const url = `${JIKAN_BASE_URL}?q=${encodeURIComponent(search)}&limit=1`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error("Jikan request failed.");
  }

  const payload = (await response.json()) as JikanResponse;
  const manga = payload.data?.[0];

  if (!manga) {
    return null;
  }

  return {
    malId: manga.mal_id,
    title: manga.title,
    synopsis: normalizeSynopsis(manga.synopsis),
    coverImage: getBestCoverUrl(manga),
  };
}

async function fetchFromMangaDexByMalId(malId: number) {
  const url = `${MANGADEX_BASE_URL}?links[mal]=${malId}`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as MangaDexResponse;
  return payload.data?.[0]?.id ?? null;
}

async function fetchFromMangaDexByTitle(title: string) {
  const url = `${MANGADEX_BASE_URL}?title=${encodeURIComponent(title)}&limit=1`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as MangaDexResponse;
  return payload.data?.[0]?.id ?? null;
}

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("search")?.trim();

  if (!search) {
    return NextResponse.json(
      { error: "The ?search= parameter is required." },
      { status: 400 }
    );
  }

  try {
    const jikanManga = await fetchFromJikan(search);

    if (!jikanManga) {
      return NextResponse.json(
        { error: "No results were found for that search." },
        { status: 404 }
      );
    }

    // Try the MAL cross-reference first. If MangaDex changes its filter
    // behavior or returns nothing, fall back to a title search.
    const mangaDexId =
      (await fetchFromMangaDexByMalId(jikanManga.malId)) ??
      (await fetchFromMangaDexByTitle(jikanManga.title));

    return NextResponse.json({
      title: jikanManga.title,
      synopsis: jikanManga.synopsis,
      coverImage: jikanManga.coverImage,
      malId: jikanManga.malId,
      mangaDexId,
    });
  } catch (error) {
    console.error("Mangastoon API error:", error);

    return NextResponse.json(
      { error: "An error occurred while querying the external APIs." },
      { status: 500 }
    );
  }
}

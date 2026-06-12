import { logger } from "../../utils/logger";
import { NextRequest, NextResponse } from "next/server";
import { getLocalizedTitle } from "../../utils/get-localized-title";
import { getMangaSynopsis, type MangaDexCollectionResponse, type MangaDexManga } from "../../utils/mangadex";
import {
  appendMangaDexAvailableLanguageFilters,
  getMangaDexRequestHeaders,
  toMangaDexApiUrl,
} from "../../utils/mangadex-config";

function getBestCoverUrl(manga: MangaDexManga) {
  const coverArt = manga.relationships?.find((relationship) => relationship.type === "cover_art");
  const fileName = coverArt?.attributes?.fileName;

  return fileName ? `https://uploads.mangadex.org/covers/${manga.id}/${fileName}` : null;
}

function normalizeLocalImageUrl(value: string, apiBaseUrl: string) {
  if (!value) return "";
  return value.startsWith("http://") || value.startsWith("https://")
    ? value
    : `${apiBaseUrl.replace(/\/$/, "")}/${value.replace(/^\/+/, "")}`;
}

async function fetchFromMangaDex(search: string) {
  const params = new URLSearchParams();
  params.set("title", search);
  params.set("limit", "1");
  params.append("includes[]", "cover_art");
  params.set("hasAvailableChapters", "true");
  appendMangaDexAvailableLanguageFilters(params, "es");

  const response = await fetch(toMangaDexApiUrl(`/manga?${params.toString()}`), {
    headers: getMangaDexRequestHeaders(),
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error("MangaDex request failed.");
  }

  const payload = (await response.json()) as MangaDexCollectionResponse;
  return payload.data?.[0] ?? null;
}

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("search")?.trim();

  if (!search) {
    return NextResponse.json({ error: "The ?search= parameter is required." }, { status: 400 });
  }

  try {
    // 1. Intentar buscar en la BD local primero
    const apiUrl = process.env.MONLINE_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://46.224.213.127:8085';
    try {
      const localRes = await fetch(`${apiUrl}/api/comics?search=${encodeURIComponent(search)}`, { cache: 'no-store' });
      if (localRes.ok) {
        const localData = await localRes.json();
        if (localData.data && localData.data.length > 0) {
          const m = localData.data[0];
          return NextResponse.json({
            title: m.title,
            synopsis: m.description || "Sin descripción",
            coverImage: normalizeLocalImageUrl(m.coverImage, apiUrl),
            malId: null,
            mangaDexId: m.slug,
            source: 'local'
          });
        }
      }
    } catch (localError) {
      logger.error("Error al buscar en API local, reintentando con MangaDex", localError);
    }

    // 2. Fallback a MangaDex si no está local
    const manga = await fetchFromMangaDex(search);

    if (!manga) {
      return NextResponse.json({ error: "No results were found for that search." }, { status: 404 });
    }

    return NextResponse.json({
      title: getLocalizedTitle(manga, "es"),
      synopsis: getMangaSynopsis(manga, "es"),
      coverImage: getBestCoverUrl(manga),
      malId: null,
      mangaDexId: manga.id,
      source: 'mangadex'
    });
  } catch (error) {
    logger.error("Mangastoon API error", error);

    return NextResponse.json(
      { error: "An error occurred while querying MangaDex." },
      { status: 500 }
    );
  }
}

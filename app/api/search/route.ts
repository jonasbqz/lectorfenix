import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";
import { logger } from "../../utils/logger";

export const dynamic = "force-dynamic";

const SCRAPER_TIMEOUT_MS = 3000;
const MONLINE_TIMEOUT_MS = 5000;
const MONLINE_API_URL = (
  process.env.MONLINE_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://46.224.213.127:8085"
).replace(/\/$/, "");

type LocalComic = Record<string, unknown>;

function getStringValue(source: LocalComic, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function extractLocalComics(payload: unknown): LocalComic[] {
  if (Array.isArray(payload)) {
    return payload.filter((item): item is LocalComic => Boolean(item) && typeof item === "object");
  }
  if (!payload || typeof payload !== "object") return [];

  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.data)) {
    return record.data.filter((item): item is LocalComic => Boolean(item) && typeof item === "object");
  }
  if (record.data && typeof record.data === "object") return extractLocalComics(record.data);
  if (Array.isArray(record.comics)) {
    return record.comics.filter((item): item is LocalComic => Boolean(item) && typeof item === "object");
  }
  if (Array.isArray(record.items)) {
    return record.items.filter((item): item is LocalComic => Boolean(item) && typeof item === "object");
  }
  if (Array.isArray(record.results)) {
    return record.results.filter((item): item is LocalComic => Boolean(item) && typeof item === "object");
  }
  return [];
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function localComicMatchesQuery(comic: LocalComic, query: string) {
  const needle = normalizeSearchText(query);
  if (!needle) return true;

  const primaryFields = [
    getStringValue(comic, ["title", "name", "comic_title", "original_title"]),
    getStringValue(comic, ["slug", "manga_slug", "comic_slug"]),
    getStringValue(comic, ["titleAlternative", "alternative_title", "alt_title"]),
  ].map(normalizeSearchText).filter(Boolean);

  const haystack = primaryFields.join(" ");
  const tokens = needle.split(/\s+/).filter((token) => token.length > 1);
  if (tokens.length > 1) {
    return tokens.every((token) => haystack.includes(token));
  }

  return primaryFields.some((value) => value.includes(needle) || needle.includes(value));
}

function getGenres(comic: LocalComic) {
  const rawGenres = comic.genres ?? comic.genre ?? comic.tags ?? comic.categories ?? comic.comicGenres;
  const values = Array.isArray(rawGenres)
    ? rawGenres
    : typeof rawGenres === "string"
      ? rawGenres.split(",")
      : [];

  return values
    .map((genre) => {
      if (typeof genre === "string") return genre.trim();
      if (genre && typeof genre === "object") {
        const record = genre as Record<string, unknown>;
        if (record.genre && typeof record.genre === "object") {
          return getStringValue(record.genre as LocalComic, ["name", "title", "slug"]);
        }
        return getStringValue(record as LocalComic, ["name", "title", "slug"]);
      }
      return "";
    })
    .filter(Boolean)
    .slice(0, 8);
}

function mapLocalComicsToSearchResults(comics: LocalComic[]) {
  return comics.map((comic) => {
    const title = getStringValue(comic, ["title", "name", "comic_title", "original_title"]) || "MangaStoon";
    const slug = getStringValue(comic, ["slug", "manga_slug", "comic_slug", "id"]);
    const cover = getStringValue(comic, ["coverImage", "cover_image", "cover", "thumbnail", "image", "poster", "url_cover"]);

    return {
      title,
      slug,
      url: slug ? `${MONLINE_API_URL}/comics/${slug}` : "",
      cover,
      genres: getGenres(comic),
    };
  });
}

async function fetchMonlineFallbackSearch(query: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MONLINE_TIMEOUT_MS);

  try {
    const params = new URLSearchParams();
    params.set("limit", "200");
    params.set("v", "2");

    const response = await fetch(`${MONLINE_API_URL}/api/comics?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) return [];

    const comics = extractLocalComics(await response.json());
    return mapLocalComicsToSearchResults(
      comics.filter((comic) => localComicMatchesQuery(comic, query)).slice(0, 24)
    );
  } catch (error) {
    logger.error("Monline fallback search failed", error);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

async function logFailedSearch(query: string) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://xlcsqqwelopzpslxgdni.supabase.co";
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const supabase = serviceRoleKey
      ? createSupabaseClient(supabaseUrl, serviceRoleKey, {
          auth: { persistSession: false },
        })
      : await createClient();

    const { data: existing, error: findError } = await supabase
      .from("failed_searches")
      .select("id, count")
      .eq("query", query)
      .maybeSingle();

    if (!findError) {
      if (existing) {
        await supabase
          .from("failed_searches")
          .update({
            count: existing.count + 1,
            last_searched: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("failed_searches").insert({
          query,
          count: 1,
          last_searched: new Date().toISOString(),
        });
      }
    } else {
      logger.error("Error checking failed search in database:", findError);
    }
  } catch (dbErr) {
    logger.error("Failed to log empty search to database", dbErr);
  }
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ error: "The ?q= parameter is required." }, { status: 400 });
  }

  const apiBaseUrl = process.env.MANGAVF_API_URL || process.env.NEXT_PUBLIC_MANGAVF_API_URL || "http://localhost:3001";
  const targetUrl = `${apiBaseUrl}/api/v1/manga/search?q=${encodeURIComponent(query)}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SCRAPER_TIMEOUT_MS);
    const response = await fetch(targetUrl, {
      cache: "no-store",
      signal: controller.signal,
    }).finally(() => {
      clearTimeout(timeout);
    });

    if (!response.ok) {
      logger.error(`Search proxy request failed: ${response.status} ${response.statusText}`);
      const fallbackResults = await fetchMonlineFallbackSearch(query);
      if (fallbackResults.length > 0) {
        return NextResponse.json({
          results: fallbackResults,
          fallback: "monline",
          upstreamStatus: response.status,
        });
      }
      return NextResponse.json({ error: "Search request failed", results: [] });
    }

    const data = await response.json();
    if (!data.results || data.results.length === 0) {
      await logFailedSearch(query);
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error("Error proxying search request", error);
    const fallbackResults = await fetchMonlineFallbackSearch(query);
    if (fallbackResults.length > 0) {
      return NextResponse.json({
        results: fallbackResults,
        fallback: "monline",
        upstreamError: error instanceof Error ? error.message : "UNKNOWN",
      });
    }
    return NextResponse.json({ error: "An error occurred while proxying search.", results: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();
    const cleanQuery = query?.trim();

    if (!cleanQuery) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    await logFailedSearch(cleanQuery);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error("Error in POST failed search:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

import { logger } from "./logger";
import { getCached, setCached, stableCacheKey } from "./server-cache";
const MONLINE_API_URL = (
  process.env.MONLINE_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://46.224.213.127:8085"
).replace(/\/$/, "");

const MONLINE_TIMEOUT_MS = 8000; // 👈 LO SUBIMOS A 8 SEGUNDOS (Hetzner lo necesita)

export type MonlineRouteResponse = {
  data?: {
    id?: number | string | null;
  } | null;
};

export type MonlinePagesResponse = {
  data?: {
    url_pages?: unknown;
  } | null;
};

export type MonlineChapterLike = {
  id?: string;
  attributes?: {
    chapter?: string | null;
    title?: string | null;
  };
};

export function toMonlineSegment(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function uniqueNonEmpty(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean))) as string[];
}

export function isMonlineChapterPageUrl(value: string) {
  const raw = value.trim();
  if (!raw) return false;

  const normalized = decodeURIComponent(raw).toLowerCase();

  // Las páginas reales vienen bajo /storage/comics/{comicId}/{chapterId}/...
  // Las portadas/recomendados vienen bajo /storage/comics/covers/... y no son páginas del capítulo.
  if (normalized.includes("/storage/comics/covers/")) return false;

  // Algunos capítulos traen assets sueltos de reporte/créditos de la fuente.
  // No tocamos imágenes tipo 1_01.webp porque pueden incluir intro + viñetas reales.
  if (normalized.includes("zonaolympus")) return false;
  if (normalized.includes("z (reporte)") || normalized.includes("z%20(reporte)")) return false;
  if (normalized.includes("reporte).webp")) return false;

  return true;
}

export function filterMonlineChapterPageUrls(rawPages: unknown) {
  return Array.isArray(rawPages)
    ? rawPages.filter((url): url is string => typeof url === "string" && isMonlineChapterPageUrl(url))
    : [];
}

export function buildMonlineChapterSegments(chapter: MonlineChapterLike | null | undefined) {
  const chapterNumber = chapter?.attributes?.chapter?.trim();
  const title = chapter?.attributes?.title;

  return uniqueNonEmpty([
    toMonlineSegment(title),
    chapterNumber ? toMonlineSegment(`chapter-${chapterNumber}`) : "",
    chapterNumber ? toMonlineSegment(`capitulo-${chapterNumber}`) : "",
    chapterNumber ? toMonlineSegment(chapterNumber) : "",
    toMonlineSegment(chapter?.id),
  ]);
}

async function resolveMonlinePagesFromRoute(cleanMangaSegments: string[], cleanChapterSegments: string[]) {
  for (const comicSegment of cleanMangaSegments) {
    for (const chapterSegment of cleanChapterSegments) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), MONLINE_TIMEOUT_MS);

      try {
        logger.debug(`Buscando en API: ${comicSegment} / ${chapterSegment}`);

        const routeUrl = new URL(`${MONLINE_API_URL}/api/chapters/route`);
        routeUrl.searchParams.set("comicSegment", comicSegment);
        routeUrl.searchParams.set("chapterSegment", chapterSegment);

        const routeResponse = await fetch(routeUrl.toString(), {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!routeResponse.ok) continue;

        const routePayload = (await routeResponse.json()) as MonlineRouteResponse;
        const monlineId = routePayload.data?.id;

        if (monlineId === undefined || monlineId === null || monlineId === "") continue;

        const pagesResponse = await fetch(
          `${MONLINE_API_URL}/api/chapters/${encodeURIComponent(String(monlineId))}/pages`,
          { cache: "no-store", signal: controller.signal }
        );

        if (!pagesResponse.ok) continue;

        const pagesPayload = (await pagesResponse.json()) as MonlinePagesResponse;
        const rawPages = pagesPayload.data?.url_pages;
        const pages = filterMonlineChapterPageUrls(rawPages);

        if (pages.length > 0) {
          logger.debug(`Encontrado: ${pages.length} paginas.`);
          return pages;
        }
      } catch (err) {
        logger.error(`Fallo en intento: ${err instanceof Error ? err.message : String(err)}`);
        continue;
      } finally {
        clearTimeout(timeout);
      }
    }
  }

  return [] as string[];
}

export async function fetchMonlinePagesFromRoute({
  mangaSegments,
  chapterSegments,
}: {
  mangaSegments: string[];
  chapterSegments: string[];
}) {
  const cleanMangaSegments = uniqueNonEmpty(mangaSegments.map(toMonlineSegment));
  const cleanChapterSegments = uniqueNonEmpty(chapterSegments.map(toMonlineSegment));

  if (cleanMangaSegments.length === 0 || cleanChapterSegments.length === 0) {
    return [] as string[];
  }

  const cacheKey = stableCacheKey("monline-pages-route", [
    cleanMangaSegments.join("|"),
    cleanChapterSegments.join("|"),
  ]);

  const cachedPages = await getCached<string[]>(cacheKey);
  if (cachedPages) return cachedPages;

  const pages = await resolveMonlinePagesFromRoute(cleanMangaSegments, cleanChapterSegments);

  // Cache successful route matches for a long time, but also cache misses briefly
  // so the same MangaDex chapter does not trigger dozens of repeated Monline probes.
  await setCached(cacheKey, pages, pages.length > 0 ? 60 * 60 * 24 * 7 : 60 * 10);

  return pages;
}

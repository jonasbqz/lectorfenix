import { NextResponse } from "next/server";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://mangastoon.com").replace(/\/$/, "");

export const SITE_NAME = "MangaStoon";

export const SITE_DESCRIPTION =
  "Explora y lee manga, manhwa y comics online en alta calidad. Actualizaciones diarias en español, inglés y portugués.";

export const SITE_IMAGE = "/opengraph-image";

export const MANGADEX_API_URL = "https://api.mangadex.org";
export const SITEMAP_PAGE_SIZE = 100;
export const MAX_MANGADEX_SITEMAP_PAGES = 200;
export const MAX_MONLINE_SITEMAP_PAGES = 100;
const PUBLIC_MONLINE_API_URL = process.env.NEXT_PUBLIC_API_URL?.startsWith("http")
  ? process.env.NEXT_PUBLIC_API_URL
  : undefined;

export const MONLINE_API_URL = (
  process.env.MONLINE_API_URL ??
  PUBLIC_MONLINE_API_URL ??
  "http://46.224.213.127:8085"
).replace(/\/$/, "");

export const MANGADEX_SITEMAP_LANGUAGES = ["es", "en", "pt", "pt-br"] as const;

export function absoluteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalizedPath}`;
}

export function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function xmlResponse(xml: string, maxAge = 3600) {
  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=${maxAge}`,
    },
  });
}

export function buildMangaDexSitemapSearchParams(limit: number, offset: number) {
  const searchParams = new URLSearchParams();
  searchParams.set("limit", String(limit));
  searchParams.set("offset", String(offset));

  // Intencional: NO usamos hasAvailableChapters=true ni availableTranslatedLanguage[].
  // Esos filtros dependen de capitulos disponibles y dejan fuera fichas indexables.
  // El sitemap debe cubrir fichas es/en/pt cuando existan en titulo/alt/metadata,
  // sin bloquear mangas nuevos que aun no tengan capitulos traducidos.

  return searchParams;
}

export function getSitemapPageCountFromTotal(total: number, maxPages: number) {
  return Math.max(0, Math.min(Math.ceil(Math.max(0, total) / SITEMAP_PAGE_SIZE), maxPages));
}

export async function getMangaDexSitemapTotal() {
  const searchParams = buildMangaDexSitemapSearchParams(1, 0);

  const response = await fetch(`${MANGADEX_API_URL}/manga?${searchParams.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`MangaDex sitemap stats failed: ${response.status}`);
  }

  const payload = (await response.json()) as { total?: number };
  return Math.max(0, payload.total ?? 0);
}

type MonlineSitemapPayload = {
  data?: unknown[] | { total?: number; comics?: unknown[]; items?: unknown[]; results?: unknown[] };
  total?: number;
  pagination?: { total?: number };
  comics?: unknown[];
  items?: unknown[];
  results?: unknown[];
};

export function getMonlineSitemapTotalFromPayload(payload: MonlineSitemapPayload, fallback = 0) {
  if (typeof payload.total === "number") return payload.total;
  if (typeof payload.pagination?.total === "number") return payload.pagination.total;
  if (!Array.isArray(payload.data) && typeof payload.data?.total === "number") return payload.data.total;
  return fallback;
}

export function extractMonlineSitemapComics(payload: MonlineSitemapPayload) {
  if (Array.isArray(payload.data)) return payload.data;
  if (!Array.isArray(payload.data) && Array.isArray(payload.data?.comics)) return payload.data.comics;
  if (!Array.isArray(payload.data) && Array.isArray(payload.data?.items)) return payload.data.items;
  if (!Array.isArray(payload.data) && Array.isArray(payload.data?.results)) return payload.data.results;
  if (Array.isArray(payload.comics)) return payload.comics;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.results)) return payload.results;
  return [];
}

export async function getMonlineSitemapTotal() {
  const searchParams = new URLSearchParams();
  searchParams.set("limit", "1");
  searchParams.set("page", "1");

  const response = await fetch(`${MONLINE_API_URL}/api/comics?${searchParams.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Monline sitemap stats failed: ${response.status}`);
  }

  const payload = (await response.json()) as MonlineSitemapPayload;
  return Math.max(0, getMonlineSitemapTotalFromPayload(payload, extractMonlineSitemapComics(payload).length));
}

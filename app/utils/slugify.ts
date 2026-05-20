export function slugify(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-") || "comic";
}

export function extractComicIdFromSlugId(slugId: string) {
  const decoded = decodeURIComponent(slugId);
  const uuid = decoded.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)?.[0];

  return uuid ?? decoded;
}

function isMangaDexUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function buildRouteSlug(title: string | null | undefined, id: string) {
  const cleanId = decodeURIComponent(id).replace(/^\/?comics\//, "").replace(/^\/+|\/+$/g, "");

  if (!cleanId) return slugify(title);
  if (isMangaDexUuid(cleanId)) return `${slugify(title)}-${cleanId}`;

  // Local/Monline IDs are already SEO slugs. Prefixing the title again creates
  // duplicated routes like /comics/title-title-20260514...
  return cleanId;
}

export function buildComicPath(title: string | null | undefined, id: string) {
  return `/comics/${buildRouteSlug(title, id)}`;
}

export function buildChapterPath(title: string | null | undefined, mangaId: string, chapterId: string, lang?: string) {
  const path = `/comics/${buildRouteSlug(title, mangaId)}/chapters/${chapterId}`;
  return lang && lang !== "es" ? `${path}?lang=${encodeURIComponent(lang)}` : path;
}

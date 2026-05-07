export const MANGADEX_USER_AGENT = "Mangastoon/1.0.0";

export function getMangaDexApiBase() {
  return (process.env.NEXT_PUBLIC_API_URL || "https://api.mangadex.org").replace(/\/+$/, "");
}

export function toMangaDexApiUrl(pathOrUrl: string) {
  if (pathOrUrl.startsWith("https://api.mangadex.org")) {
    return pathOrUrl.replace("https://api.mangadex.org", getMangaDexApiBase());
  }

  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${getMangaDexApiBase()}${path}`;
}

export function getMangaDexRequestHeaders() {
  return {
    Accept: "application/json",
    "User-Agent": MANGADEX_USER_AGENT,
  };
}

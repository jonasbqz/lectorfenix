export function getOptimizedImageUrl(url: string): string {
  if (!url) return "";
  try {
    // Evitar reprocesar URLs que ya son del proxy
    if (url.startsWith("/api/proxy-image") || url.includes("/api/proxy-image")) {
      return url;
    }

    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    // Detectar URLs rotas del buscador del scraper (ej: https://c14c4b3dd51396dc.jpg)
    // donde el nombre del archivo se convirtió erróneamente en el nombre del host.
    if (
      hostname.endsWith(".jpg") ||
      hostname.endsWith(".jpeg") ||
      hostname.endsWith(".png") ||
      hostname.endsWith(".webp") ||
      hostname.endsWith(".gif")
    ) {
      return "/icon.png";
    }

    const isHotlinkingBlockedHost =
      hostname.endsWith("olympusbiblioteca.com") ||
      hostname.endsWith("olympusxyz.com") ||
      hostname.endsWith("yoveo.xyz");

    if (isHotlinkingBlockedHost) {
      return `/api/proxy-image?url=${encodeURIComponent(url)}`;
    }

    // MangaDex permite hotlinking y tiene su propia CDN optimizada globalmente
    if (hostname.endsWith("mangadex.org")) {
      return url;
    }

    return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&default=${encodeURIComponent(url)}&output=webp&q=75`;
  } catch {
    // Return the original URL as fallback if parsing fails (e.g. relative URLs)
    return url;
  }
}

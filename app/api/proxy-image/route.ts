import { NextResponse } from "next/server";
import { MONLINE_API_URL } from "../../utils/monline-config";

export const dynamic = "force-dynamic";

const ALLOWED_SUFFIXES = [
  ".mangadex.org",
  ".weserv.nl",
  ".ikigaimangas.cloud",
  ".olympusbiblioteca.com",
  ".olympusxyz.com",
  ".platformoctopus.workers.dev",
  ".mangavf.fr",
  ".statically.io",
  ".flyimg.io",
  ".yoveo.xyz",
  ".leercapitulo.co",
  ".t34798ndc.com",
];

const ALLOWED_EXACT_HOSTS = new Set([
  "uploads.mangadex.org",
  "images.weserv.nl",
  "media.ikigaimangas.cloud",
  "image.ikigaimangas.cloud",
  "dashboard.olympusbiblioteca.com",
  "dashboard.olympusxyz.com",
  "server-img.platformoctopus.workers.dev",
  "cdn.mangavf.fr",
  "cdn.statically.io",
  "demo.flyimg.io",
  "nobledicion.yoveo.xyz",
  "yoveo.xyz",
  "localhost",
  "127.0.0.1",
  "46.224.213.127",
  "www.leercapitulo.co",
  "leercapitulo.co",
]);

function isAllowedUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();

    // Bloquear loopback y local IPs en producción para prevenir SSRF
    const isProduction = process.env.NODE_ENV === "production";
    if (isProduction && (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "46.224.213.127")) {
      return false;
    }

    if (ALLOWED_EXACT_HOSTS.has(hostname)) {
      return true;
    }

    try {
      const monlineUrl = new URL(MONLINE_API_URL);
      if (hostname === monlineUrl.hostname.toLowerCase()) {
        return true;
      }
    } catch {
      // Ignorar si la URL de Monline configurada no es válida
    }

    for (const suffix of ALLOWED_SUFFIXES) {
      if (hostname.endsWith(suffix)) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

function fallbackImage(errorCode: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900"><rect width="100%" height="100%" fill="#141519"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="24" font-weight="600" fill="#9ca3af" font-family="sans-serif">ERROR CARGANDO IMAGEN</text><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-size="16" fill="#4b5563">${errorCode}</text></svg>`;

  return new NextResponse(svg, {
    status: 502,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "no-store, no-cache",
      "X-Proxy-Version": "redirect-fallback-v2",
    },
  });
}

export async function GET(req: Request) {
  let imageUrl = "";

  try {
    const { searchParams } = new URL(req.url);
    imageUrl = searchParams.get("url") ?? "";

    if (!imageUrl) return fallbackImage("NO_URL");

    if (!isAllowedUrl(imageUrl)) {
      return fallbackImage("URL_BLOCKED");
    }

    const parsedUrl = new URL(imageUrl);
    const hostname = parsedUrl.hostname.toLowerCase();

    // Use exact referrer for Olympus and others to avoid hotlinking blocks
    let referer = parsedUrl.origin;
    if (hostname.endsWith("olympusbiblioteca.com")) {
      referer = "https://olympusbiblioteca.com/";
    } else if (hostname.endsWith("olympusxyz.com")) {
      referer = "https://olympusxyz.com/";
    } else if (hostname.endsWith("yoveo.xyz")) {
      referer = "https://yoveo.xyz/";
    } else if (hostname.endsWith("mangadex.org")) {
      referer = "https://mangadex.org/";
    }

    const userAgent = req.headers.get("user-agent") ||
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

    const headers = {
      "User-Agent": userAgent,
      Referer: referer,
      Accept: "image/webp,image/avif,image/png,image/jpeg,image/*,*/*;q=0.8",
    };

    // Add a 12 seconds timeout to avoid hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const isHotlinkingBlockedHost = hostname.endsWith("olympusbiblioteca.com") || hostname.endsWith("olympusxyz.com") || hostname.endsWith("yoveo.xyz");
    let res: Response | null = null;

    if (isHotlinkingBlockedHost) {
      // Intentar el worker directamente para evitar timeouts de hosts que bloquean hotlinking
      try {
        const workerUrl = `https://server-img.platformoctopus.workers.dev/img?url=${encodeURIComponent(imageUrl)}&origin=${encodeURIComponent(referer)}`;
        const workerRes = await fetch(workerUrl, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (workerRes.ok) {
          res = workerRes;
        }
      } catch (err) {
        // Ignorar para intentar flujo normal
      }
    }

    if (!res) {
      try {
        res = await fetch(imageUrl, {
          headers,
          cache: "no-store",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          // Fallback to Worker if fetch failed with error status (e.g. 403)
          try {
            const workerUrl = `https://server-img.platformoctopus.workers.dev/img?url=${encodeURIComponent(imageUrl)}&origin=${encodeURIComponent(referer)}`;
            const workerRes = await fetch(workerUrl, {
              cache: "no-store",
              signal: controller.signal,
            });
            if (workerRes.ok) {
              res = workerRes;
            }
          } catch {
            // If worker fails, continue with original failed response
          }
        }
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        // Fallback to Worker if fetch threw an exception (e.g. timeout)
        try {
          const workerUrl = `https://server-img.platformoctopus.workers.dev/img?url=${encodeURIComponent(imageUrl)}&origin=${encodeURIComponent(referer)}`;
          const workerRes = await fetch(workerUrl, {
            cache: "no-store",
          });
          if (workerRes.ok) {
            res = workerRes;
          }
        } catch {
          // Ignore and allow fallback to redirect/error below
        }
      }
    } else {
      clearTimeout(timeoutId);
    }

    if (!res || !res.ok) {
      return fallbackImage("FETCH_FAILED");
    }

    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": res.headers.get("content-type") || "image/webp",
        "Cache-Control": "public, max-age=86400",
        "X-Proxy-Version": "fetch-success-v2",
      },
    });
  } catch (error) {
    return fallbackImage("FETCH_FAILED");
  }
}

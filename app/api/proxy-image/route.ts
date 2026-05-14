import { logger } from "../../utils/logger";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROXY_VERSION = "node-direct-v3";
const REQUEST_TIMEOUT_MS = 20000;
const FORCED_REFERER = "https://olympusbiblioteca.com/";

function getBrowserHeaders() {
  return {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
    "Accept-Encoding": "identity",
    Referer: FORCED_REFERER,
    Origin: "https://olympusbiblioteca.com",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    "Sec-Ch-Ua": '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "image",
    "Sec-Fetch-Mode": "no-cors",
    "Sec-Fetch-Site": "same-origin",
  };
}

function getErrorCode(error: unknown) {
  if (typeof error === "object" && error !== null) {
    const record = error as Record<string, unknown>;
    const code = record.code ?? record.statusCode ?? record.status;
    if (typeof code === "string" || typeof code === "number") return String(code);
  }

  if (error instanceof Error) return error.message || "UNKNOWN";

  return "UNKNOWN";
}

function proxyHeaders(contentType: string, errorCode = "NONE", cacheControl = "public, max-age=31536000, immutable") {
  return {
    "Content-Type": contentType,
    "Cache-Control": cacheControl,
    "X-Content-Type-Options": "nosniff",
    "X-Proxy-Version": PROXY_VERSION,
    "X-Proxy-Error": errorCode.slice(0, 180),
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url");

  if (!rawUrl) {
    return new NextResponse("Image proxy failed", {
      status: 400,
      headers: proxyHeaders("text/plain; charset=utf-8", "MISSING_URL", "no-store"),
    });
  }

  let targetUrl: URL;

  try {
    targetUrl = new URL(rawUrl);
  } catch {
    return new NextResponse("Image proxy failed", {
      status: 400,
      headers: proxyHeaders("text/plain; charset=utf-8", "INVALID_URL", "no-store"),
    });
  }

  if (targetUrl.protocol !== "https:" && targetUrl.protocol !== "http:") {
    return new NextResponse("Image proxy failed", {
      status: 400,
      headers: proxyHeaders("text/plain; charset=utf-8", "UNSUPPORTED_PROTOCOL", "no-store"),
    });
  }

  if (targetUrl.hostname === "dashboard.olympusbiblioteca.com") {
    return new NextResponse(null, {
      status: 307,
      headers: {
        Location: targetUrl.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Proxy-Version": PROXY_VERSION,
        "X-Proxy-Error": "OLYMPUS_DIRECT_BYPASS",
      },
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(targetUrl, {
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
      headers: getBrowserHeaders(),
    });

    const contentType = response.headers.get("content-type") || "image/webp";

    if (!response.ok) {
      return new NextResponse("Image proxy failed", {
        status: response.status,
        headers: proxyHeaders("text/plain; charset=utf-8", String(response.status), "no-store"),
      });
    }

    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: proxyHeaders(contentType),
    });
  } catch (error) {
    const errorCode = getErrorCode(error);
    logger.error("ERROR PROXY", rawUrl, errorCode, error);

    return new NextResponse("Image proxy failed", {
      status: 502,
      headers: proxyHeaders("text/plain; charset=utf-8", errorCode, "no-store"),
    });
  } finally {
    clearTimeout(timeout);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getMangaDexRequestHeaders, toMangaDexApiUrl } from "../../../../utils/mangadex-config";

export const revalidate = 3600;

type AtHomeResponse = {
  baseUrl: string;
  chapter: {
    hash: string;
    data: string[];
  };
};

const RETRY_DELAY_MS = 1200;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchMangaDex(url: string, retries = 1) {
  const response = await fetch(toMangaDexApiUrl(url), {
    headers: getMangaDexRequestHeaders(),
    next: { revalidate: 3600 },
  });

  if (response.status === 429 && retries > 0) {
    const retryAfter = Number(response.headers.get("retry-after"));
    await wait(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : RETRY_DELAY_MS);
    return fetchMangaDex(url, retries - 1);
  }

  return response;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = await params;

  try {
    const response = await fetchMangaDex(`https://api.mangadex.org/at-home/server/${chapterId}`);

    if (!response.ok) {
      return NextResponse.json(
        {
          pages: [],
          error: response.status === 429 ? "Servidor ocupado, reintentando..." : "No pudimos cargar este capitulo.",
          code: response.status === 429 ? "RATE_LIMIT" : "AT_HOME_FAILED",
        },
        { status: response.status === 429 ? 429 : 503 }
      );
    }

    const payload = (await response.json()) as AtHomeResponse;
    const hash = payload.chapter?.hash;
    const files = payload.chapter?.data ?? [];
    const pages = payload.baseUrl && hash ? files.map((filename) => `${payload.baseUrl}/data/${hash}/${filename}`) : [];

    return NextResponse.json(
      { pages },
      { headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400" } }
    );
  } catch {
    return NextResponse.json(
      { pages: [], error: "Servidor ocupado, reintentando...", code: "MANGADEX_UNAVAILABLE" },
      { status: 503, headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=86400" } }
    );
  }
}

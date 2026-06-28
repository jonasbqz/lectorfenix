import { NextResponse } from 'next/server';
import dns from 'dns/promises';

export const dynamic = 'force-dynamic';

export async function GET() {
  const tests = [
    { url: 'http://10.0.1.1/api/comics?limit=1', host: 'api.mangolibreria.com' },
    { url: 'http://172.17.0.1/api/comics?limit=1', host: 'api.mangolibreria.com' },
    { url: 'http://10.0.1.1:8085/api/comics?limit=1', host: 'api.mangolibreria.com' },
    { url: 'http://127.0.0.1:8085/api/comics?limit=1', host: 'api.mangolibreria.com' }
  ];

  const results: Record<string, any> = {};
  for (const t of tests) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(t.url, {
        headers: {
          'Host': t.host,
          'User-Agent': 'Mozilla/5.0'
        },
        signal: controller.signal
      });
      clearTimeout(timeout);
      results[t.url] = {
        status: res.status,
        ok: res.ok,
        data: res.ok ? (await res.json()) : null
      };
    } catch (err: any) {
      results[t.url] = { error: err.message };
    }
  }

  return NextResponse.json({ results });
}

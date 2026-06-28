import { NextResponse } from 'next/server';
import dns from 'dns/promises';

export const dynamic = 'force-dynamic';

export async function GET() {
  const baseIP = '10.0.1';
  const ports = [3000, 8085, 8887];
  const promises = [];

  for (let i = 2; i <= 60; i++) {
    const ip = `${baseIP}.${i}`;
    for (const p of ports) {
      const url = `http://${ip}:${p}/api/comics?limit=1`;
      promises.push((async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 600);
        try {
          const res = await fetch(url, {
            signal: controller.signal
          });
          clearTimeout(timeout);
          return { url, status: res.status, ok: res.ok };
        } catch (err: any) {
          clearTimeout(timeout);
          return null;
        }
      })());
    }
  }

  const resolved = (await Promise.all(promises)).filter(Boolean);
  return NextResponse.json({ resolved });
}

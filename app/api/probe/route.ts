import { NextResponse } from 'next/server';
import dns from 'dns/promises';

export const dynamic = 'force-dynamic';

export async function GET() {
  const candidates = [
    'monline-api',
    'monlineapi',
    'api',
    'mangabiblioteca-api',
    'mangastoon-api',
    'monline-api-prod',
    'monline-api-service',
    'web',
    'app',
    'db',
    'postgres'
  ];

  const results: Record<string, string | null> = {};
  for (const c of candidates) {
    try {
      const addresses = await dns.lookup(c);
      results[c] = addresses.address;
    } catch (err: any) {
      results[c] = `failed: ${err.message}`;
    }
  }

  let hostsContent = '';
  try {
    const fs = require('fs');
    hostsContent = fs.readFileSync('/etc/hosts', 'utf8');
  } catch (err: any) {
    hostsContent = `failed to read: ${err.message}`;
  }

  return NextResponse.json({ results, hostsContent });
}

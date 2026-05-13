import {
  MAX_MANGADEX_SITEMAP_PAGES,
  MAX_MONLINE_SITEMAP_PAGES,
  SITE_URL,
  escapeXml,
  getMangaDexSitemapTotal,
  getMonlineSitemapTotal,
  getSitemapPageCountFromTotal,
  xmlResponse,
} from "../utils/seo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getSitemapPageCount() {
  try {
    const [mangaDexTotal, monlineTotal] = await Promise.all([
      getMangaDexSitemapTotal(),
      getMonlineSitemapTotal(),
    ]);

    const mangaDexPages = getSitemapPageCountFromTotal(
      mangaDexTotal,
      MAX_MANGADEX_SITEMAP_PAGES
    );
    const monlinePages = getSitemapPageCountFromTotal(
      monlineTotal,
      MAX_MONLINE_SITEMAP_PAGES
    );

    return Math.max(1, mangaDexPages + monlinePages);
  } catch (error) {
    console.error("Error fetching sitemap stats:", error);
    return MAX_MANGADEX_SITEMAP_PAGES;
  }
}

export async function GET() {
  const now = new Date().toISOString();
  const dynamicPageCount = await getSitemapPageCount();
  const sitemaps = [
    `  <sitemap>\n    <loc>${escapeXml(`${SITE_URL}/sitemap-static.xml`)}</loc>\n    <lastmod>${now}</lastmod>\n  </sitemap>`,
  ];

  for (let page = 0; page < dynamicPageCount; page += 1) {
    sitemaps.push(
      `  <sitemap>\n    <loc>${escapeXml(`${SITE_URL}/sitemap/${page}`)}</loc>\n    <lastmod>${now}</lastmod>\n  </sitemap>`
    );
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemaps.join("\n")}\n</sitemapindex>`;

  return xmlResponse(xml, 0);
}

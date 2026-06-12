import type { Metadata } from "next";
import SiteHeader from "../components/site-header";
import { fetchMangaDexCollection, buildMangaDexMangaUrl, mapToShowcaseItems } from "../utils/mangadex";
import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl } from "../utils/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Explorar catálogo de mangas, manhwas y manhuas online | ${SITE_NAME}`,
  description: "Explora la biblioteca completa de mangas, manhwas y manhuas en MangaStoon con capítulos actualizados.",
  alternates: {
    canonical: absoluteUrl("/explore"),
  },
};

async function getLocalMangas() {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8085';
    const res = await fetch(`${apiUrl}/api/comics`, { cache: 'no-store' });
    const json = await res.json();
    return (json.data || []).map((m: any) => ({
      mangaDexId: m.slug,
      title: m.title,
      coverImage: m.coverImage,
      type: m.type || 'Manga'
    }));
  } catch (e) { return []; }
}

export default async function ExplorePage() {
  const local = await getLocalMangas();
  const mdRes = await fetchMangaDexCollection(buildMangaDexMangaUrl({ limit: "24" }, false, "es"));
  const mdMangas = mapToShowcaseItems(mdRes.data || [], {}, "es");

  // Juntamos todo: Los tuyos primero
  const all = [...local, ...mdMangas];

  return (
    <main className="min-h-screen bg-[#141519] text-white">
      <SiteHeader language="es" />
      <div className="mx-auto max-w-[1600px] px-6 py-10">
        <h1 className="text-3xl font-bold mb-8 border-l-4 border-orange-500 pl-4">Explorar Catálogo</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {all.map((manga) => (
            <a key={manga.mangaDexId} href={`/manga/${manga.mangaDexId}`} className="group block">
              <div className="relative aspect-[3/4] rounded-lg overflow-hidden border border-gray-800 bg-gray-900">
                <img src={manga.coverImage} alt={manga.title} className="object-cover w-full h-full group-hover:scale-105 transition duration-300" />
              </div>
              <h3 className="mt-3 text-sm font-semibold truncate group-hover:text-orange-500 transition">{manga.title}</h3>
              <p className="text-xs text-gray-500 mt-1 uppercase">{manga.type || 'Manga'}</p>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}

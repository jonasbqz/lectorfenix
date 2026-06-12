import { cookies } from "next/headers";
import type { Metadata } from "next";
import HorizontalCarousel from "./components/horizontal-carousel";
import SiteHeader, { type SupportedLanguage } from "./components/site-header";
import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl } from "./utils/seo";
import {
  buildMangaDexMangaUrl,
  fetchMangaDexCollection,
  mapToShowcaseItems,
} from "./utils/mangadex";

export const metadata: Metadata = {
  alternates: {
    canonical: absoluteUrl("/"),
  },
};

async function fetchLocalMangas() {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8085';
    const res = await fetch(`${apiUrl}/api/comics`, { cache: 'no-store' });
    const json = await res.json();
    // Mapeamos tus datos: El título limpio y el slug completo para el link
    return (json.data || []).map((m: any) => ({
      mangaDexId: m.slug, 
      title: m.title,     
      coverImage: m.coverImage,
    }));
  } catch (e) { return []; }
}

export default async function HomePage() {
  const cookieStore = await cookies();
  const lang = (cookieStore.get("lang")?.value || "es") as SupportedLanguage;
  const isAdult = cookieStore.get("mangastoon_adult")?.value === "true";

  const [localMangas, topManhwasRes, worldTopRes, latestRes] = await Promise.all([
    fetchLocalMangas(),
    fetchMangaDexCollection(buildMangaDexMangaUrl({ limit: "15", "originalLanguage[]": "ko", "order[followedCount]": "desc" }, isAdult, lang)),
    fetchMangaDexCollection(buildMangaDexMangaUrl({ limit: "15", "order[followedCount]": "desc" }, isAdult, lang)),
    fetchMangaDexCollection(buildMangaDexMangaUrl({ limit: "20", "order[latestUploadedChapter]": "desc" }, isAdult, lang)),
  ]);

  return (
    <main className="min-h-screen bg-[#141519] pb-12 text-white">
      <SiteHeader language={lang} />
      <div className="mx-auto max-w-[1600px] space-y-12 px-4 py-8 md:px-8 lg:px-12">
        
        {/* EL TOP DEL DIA ES TU API LOCAL */}
        <HorizontalCarousel 
          mangas={localMangas} 
          title="Lo mas Top del Dia" 
          subtitle="Tus series favoritas actualizadas" 
          featuredCards 
        />

        <HorizontalCarousel mangas={mapToShowcaseItems(topManhwasRes.data || [], {}, lang)} title="Top Manhwas" />
        <HorizontalCarousel mangas={mapToShowcaseItems(worldTopRes.data || [], {}, lang)} title="Top Mundial" />
        <HorizontalCarousel mangas={mapToShowcaseItems(latestRes.data || [], {}, lang)} title="Nuevos Lanzamientos" />
      </div>
    </main>
  );
}

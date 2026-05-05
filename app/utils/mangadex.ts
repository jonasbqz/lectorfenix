import type { MangaShowcaseItem } from "../components/home-carousel";
import type { SupportedLanguage } from "../components/language-provider";

export type MangaDexLocalizedText = Record<string, string>;

export type MangaDexManga = {
  id: string;
  type: "manga";
  attributes: {
    title?: MangaDexLocalizedText;
    altTitles?: MangaDexLocalizedText[];
    description?: MangaDexLocalizedText;
    originalLanguage?: string;
    contentRating?: string;
    tags?: Array<{
      id: string;
      type: "tag";
      attributes?: {
        name?: MangaDexLocalizedText;
        group?: string;
      };
    }>;
  };
  relationships?: Array<{
    id: string;
    type: string;
    attributes?: {
      fileName?: string;
    };
  }>;
};

export type MangaDexCollectionResponse = {
  data?: MangaDexManga[];
  total?: number;
  limit?: number;
  offset?: number;
  pagination?: {
    total?: number;
    limit?: number;
    offset?: number;
  };
};

export type MangaDexStatisticsResponse = {
  statistics?: Record<
    string,
    {
      rating?: {
        average?: number | null;
      };
    }
  >;
};

export type MangaDexShowcaseItem = MangaShowcaseItem & {
  synopsis: string | null;
  titleMap?: MangaDexLocalizedText;
  altTitles?: MangaDexLocalizedText[];
  originalLanguage?: string;
  genres?: Array<{
    mal_id: number;
    name: string;
  }>;
  themes?: string[];
  tags?: string[];
  isNsfw?: boolean;
};

export const SUPPORTED_READING_LANGUAGES = ["es", "es-la", "en", "pt-br"] as const;
export const SAFE_CONTENT_RATINGS = ["safe", "suggestive"] as const;
export const ADULT_CONTENT_RATINGS = ["erotica", "pornographic"] as const;

export function getAvailableTranslatedLanguageVariants(language: SupportedLanguage) {
  if (language === "es") {
    return ["es", "es-la"];
  }

  if (language === "pt") {
    return ["pt-br", "pt"];
  }

  return ["en"];
}

export function getPreferredLanguageKeys(language: SupportedLanguage) {
  if (language === "es") {
    return ["es", "es-la", "en", "ja-ro", "ja"];
  }

  if (language === "pt") {
    return ["pt-br", "pt", "en", "ja-ro", "ja"];
  }

  return ["en", "ja-ro", "ja"];
}

export function getLocalizedValue(
  value: MangaDexLocalizedText | undefined,
  language: SupportedLanguage,
  fallbacks: string[] = []
) {
  if (!value) {
    return null;
  }

  const preferredKeys = [...getPreferredLanguageKeys(language), ...fallbacks];

  for (const key of preferredKeys) {
    if (value[key]) {
      return value[key];
    }
  }

  return Object.values(value)[0] ?? null;
}

export function getMangaTitle(manga: MangaDexManga, language: SupportedLanguage) {
  const title =
    getLocalizedValue(manga.attributes.title, language) ??
    manga.attributes.altTitles
      ?.map((entry) => getLocalizedValue(entry, language))
      .find(Boolean);

  return title ?? "Untitled Manga";
}

export function getMangaSynopsis(manga: MangaDexManga, language: SupportedLanguage) {
  return getLocalizedValue(manga.attributes.description, language, ["en"]);
}

export function getCoverUrl(manga: MangaDexManga) {
  const coverArt = manga.relationships?.find((relationship) => relationship.type === "cover_art");
  const fileName = coverArt?.attributes?.fileName;

  if (!fileName) {
    return "";
  }

  return `https://uploads.mangadex.org/covers/${manga.id}/${fileName}`;
}

export function getGenreTags(manga: MangaDexManga, language: SupportedLanguage) {
  return (manga.attributes.tags ?? [])
    .filter((tag) => tag.attributes?.group === "genre")
    .slice(0, 4)
    .map((tag, index) => ({
      mal_id: Number.parseInt(tag.id.replace(/\D/g, "").slice(0, 8) || `${index + 1}`, 10),
      name: getLocalizedValue(tag.attributes?.name, language, ["en"]) ?? "Genre",
    }));
}

export function getThemeTags(manga: MangaDexManga, language: SupportedLanguage) {
  return (manga.attributes.tags ?? [])
    .filter((tag) => tag.attributes?.group === "theme")
    .map((tag) => getLocalizedValue(tag.attributes?.name, language, ["en"]) ?? "Theme");
}

export function getAllTagNames(manga: MangaDexManga) {
  return (manga.attributes.tags ?? [])
    .map((tag) => tag.attributes?.name?.en ?? Object.values(tag.attributes?.name ?? {})[0] ?? null)
    .filter((tagName): tagName is string => Boolean(tagName));
}

export async function fetchMangaDexCollection(url: string) {
  const response = await fetch(url, {
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    return { data: [], total: 0 };
  }

  const payload = (await response.json()) as MangaDexCollectionResponse;

  return {
    data: payload.data ?? [],
    total: payload.total ?? payload.pagination?.total ?? 0,
  };
}

export async function fetchMangaDexStatistics(ids: string[]) {
  if (ids.length === 0) {
    return {};
  }

  const params = new URLSearchParams();
  ids.forEach((id) => params.append("manga[]", id));

  const response = await fetch(`https://api.mangadex.org/statistics/manga?${params.toString()}`, {
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    return {};
  }

  const payload = (await response.json()) as MangaDexStatisticsResponse;
  return payload.statistics ?? {};
}

export function mapToShowcaseItems(
  mangas: MangaDexManga[],
  statistics: Record<string, { rating?: { average?: number | null } }>,
  language: SupportedLanguage
): MangaDexShowcaseItem[] {
  return mangas.map((manga) => ({
    mal_id: Number.parseInt(manga.id.replace(/\D/g, "").slice(0, 9) || "0", 10),
    title: getMangaTitle(manga, language),
    synopsis: getMangaSynopsis(manga, language),
    score: statistics[manga.id]?.rating?.average ?? null,
    url: `https://mangadex.org/title/${manga.id}`,
    mangaDexId: manga.id,
    titleMap: manga.attributes.title,
    altTitles: manga.attributes.altTitles,
    originalLanguage: manga.attributes.originalLanguage,
    images: {
      webp: {
        large_image_url: getCoverUrl(manga),
        image_url: getCoverUrl(manga),
      },
      jpg: {
        large_image_url: getCoverUrl(manga),
        image_url: getCoverUrl(manga),
      },
    },
    genres: getGenreTags(manga, language),
    themes: getThemeTags(manga, language),
    tags: getAllTagNames(manga),
    isNsfw:
      manga.attributes.contentRating === "erotica" ||
      manga.attributes.contentRating === "pornographic",
  }));
}

export function appendStandardMangaDexFilters(
  params: URLSearchParams,
  isAdult: boolean = false,
  language?: SupportedLanguage
) {
  params.append("includes[]", "cover_art");
  params.set("hasAvailableChapters", "true");

  const availableLanguages = language
    ? getAvailableTranslatedLanguageVariants(language)
    : [...SUPPORTED_READING_LANGUAGES];

  availableLanguages.forEach((lang) => {
    params.append("availableTranslatedLanguage[]", lang);
  });

  const baseContent = [...SAFE_CONTENT_RATINGS];
  const adultContent = [...ADULT_CONTENT_RATINGS];
  const ratings = isAdult ? [...baseContent, ...adultContent] : baseContent;

  ratings.forEach((rating) => {
    params.append("contentRating[]", rating);
  });
}

export function buildMangaDexMangaUrl(
  baseParams: Record<string, string | undefined>,
  isAdult: boolean = false,
  language?: SupportedLanguage
) {
  const params = new URLSearchParams();

  Object.entries(baseParams).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  appendStandardMangaDexFilters(params, isAdult, language);
  return `https://api.mangadex.org/manga?${params.toString()}`;
}

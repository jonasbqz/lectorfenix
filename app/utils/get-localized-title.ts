type LocalizedTextMap = Record<string, string>;

type LocalizableManga = {
  attributes?: {
    title?: LocalizedTextMap;
    altTitles?: LocalizedTextMap[];
  };
  titleMap?: LocalizedTextMap;
  altTitles?: LocalizedTextMap[];
};

function getLanguageCandidates(targetLang: string) {
  if (targetLang === "es" || targetLang === "es-la") {
    return ["es", "es-la"];
  }

  if (targetLang === "pt" || targetLang === "pt-br") {
    return ["pt-br", "pt"];
  }

  return [targetLang];
}

export const getLocalizedTitle = (
  manga: LocalizableManga,
  targetLang: string = "es"
) => {
  const title = manga.attributes?.title ?? manga.titleMap ?? {};
  const altTitles = manga.attributes?.altTitles ?? manga.altTitles ?? [];
  const languageCandidates = getLanguageCandidates(targetLang);

  for (const lang of languageCandidates) {
    if (title[lang]) {
      return title[lang];
    }
  }

  if (altTitles.length > 0) {
    for (const alt of altTitles) {
      for (const lang of languageCandidates) {
        if (alt[lang]) {
          return alt[lang];
        }
      }
    }
  }

  return title.en || title["ja-ro"] || Object.values(title)[0] || "Titulo Desconocido";
};

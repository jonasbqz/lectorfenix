const FALLBACK_TRANSLATIONS: Record<"es" | "pt" | "en", Array<[RegExp, string]>> = {
  es: [
    [/\bSeason\b/gi, "Temporada"],
    [/\bVolume\b/gi, "Volumen"],
    [/\bChapter\b/gi, "Capítulo"],
    [/\bAbout\b/gi, "Sobre"],
    [/\bIncident\b/gi, "Incidente"],
    [/\bStory\b/gi, "Historia"],
    [/\bWorld\b/gi, "Mundo"],
    [/\bReincarnation\b/gi, "Reencarnación"],
    [/\bGreen Tea\b/gi, "Interesada"],
    [/\bt[eé] verde\b/gi, "Interesada"],
    [/\bchico de t[eé] verde\b/gi, "Interesado"],
    [/\bpuerta de enlace\b/gi, "Portal"],
    [/\bnivelar hacia arriba\b/gi, "Subir de nivel"],
    [/\bnivelando hacia arriba\b/gi, "Subiendo de nivel"],
    [/\bnivelaci[oó]n hacia arriba\b/gi, "Subida de nivel"],
    [/\bmaestro joven\b/gi, "Joven Maestro"],
    [/\bmaestros j[oó]venes\b/gi, "Jóvenes Maestros"],
    [/\bbofetada en la cara\b/gi, "Poner en su lugar"],
    [/\bbasura de la familia\b/gi, "Escoria de la familia"],
    [/\besposa del t[eé] verde\b/gi, "Esposa interesada"],
  ],
  pt: [
    [/\bSeason\b/gi, "Temporada"],
    [/\bVolume\b/gi, "Volume"],
    [/\bChapter\b/gi, "Capítulo"],
    [/\bAbout\b/gi, "Sobre"],
    [/\bIncident\b/gi, "Incidente"],
    [/\bStory\b/gi, "História"],
    [/\bWorld\b/gi, "Mundo"],
    [/\bReincarnation\b/gi, "Reencarnação"],
    [/\bGreen Tea\b/gi, "Interesseira"],
    [/\bch[aá] verde\b/gi, "Interesseira"],
    [/\bgaroto de ch[aá] verde\b/gi, "Interesseiro"],
    [/\bporta de enlace\b/gi, "Portal"],
    [/\bnivelar para cima\b/gi, "Subir de nível"],
    [/\bnivelando para cima\b/gi, "Subindo de nível"],
    [/\bjovem mestre\b/gi, "Jovem Mestre"],
    [/\btapa na cara\b/gi, "Colocar no seu lugar"],
    [/\blixo da fam[ií]lia\b/gi, "Lixo da família"],
  ],
  en: [],
};

export function sanitizeText(text: string): string {
  if (!text) return "";

  // 1. Resolve HTML entities
  let cleaned = text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");

  // 2. Remove HTML tags (using specific tag names to avoid stripping quotation angle brackets like <La venganza...>)
  cleaned = cleaned.replace(/<\/?(?:p|br|div|span|i|b|a|h[1-6]|em|strong|small|font|img|li|ul|ol|style|script|iframe|section|article|header|footer|nav|main)(?:(?:\s+[^>]*)|(?:\s*\/))?>/gi, " ");

  // 3. Remove Markdown/BBCode tags
  cleaned = cleaned
    .replace(/\[(?:\/)?(?:b|i|u|s|hr|center|quote|spoiler|list|\*)\]/gi, " ")
    .replace(/\[(?:url|img|color|size|font)(?:=[^\]]*)?\]/gi, " ")
    .replace(/\[\/\w+\]/g, " ");

  // 4. Normalize quotes and dashes
  cleaned = cleaned
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-");

  // 5. Normalize whitespaces
  cleaned = cleaned
    .replace(/[ \t]+/g, " ")
    .replace(/\r?\n{3,}/g, "\n\n")
    .trim();

  // 6. Clean leading/trailing symbols that are formatting artifacts
  cleaned = cleaned.replace(/^[\s*_\-#•+=~|]+|[\s*_\-#•+=~|]+$/g, "").trim();

  return cleaned;
}

export function applyFallbackDictionary(text: string, targetLang: "es" | "pt" | "en") {
  return FALLBACK_TRANSLATIONS[targetLang].reduce(
    (value, [pattern, replacement]) => value.replace(pattern, replacement),
    text
  );
}

export async function forceTranslate(text: string, targetLang: "es" | "pt" | "en", sourceLang = "auto") {
  const cleanText = sanitizeText(text);

  if (!cleanText || sourceLang === targetLang) return cleanText;

  const dictionaryFallback = targetLang === "en" ? cleanText : applyFallbackDictionary(cleanText, targetLang);

  try {
    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(cleanText)}`,
      { next: { revalidate: 86400 } }
    );

    if (!response.ok) return dictionaryFallback;

    const payload = (await response.json()) as Array<Array<[string]>>;
    const translated = payload?.[0]?.map((part) => part?.[0] ?? "").join("").trim();

    const finalResult = translated || dictionaryFallback;
    const processedResult = targetLang === "en" ? finalResult : applyFallbackDictionary(finalResult, targetLang);
    return sanitizeText(processedResult);
  } catch {
    return dictionaryFallback;
  }
}

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

const INTRO_TEMPLATES: Record<"es" | "pt" | "en", string[]> = {
  es: [
    "Si estás buscando una historia fascinante que te atrape por completo, no te puedes perder {Title}. A continuación, te compartimos su argumento principal: ",
    "Sumérgete en la apasionante trama de {Title}, una obra que ya está dando de qué hablar. Aquí tienes los detalles clave de su historia: ",
    "¿Listo para adentrarte en una nueva lectura? {Title} llega a nuestra plataforma para sorprenderte. Descubre de qué trata en su sinopsis: ",
    "Explora el increíble universo que propone {Title}. Te invitamos a leer la sinopsis oficial de esta gran obra: ",
    "Para los amantes de las buenas historias, {Title} es una recomendación imperdible. Te contamos un poco de su argumento: "
  ],
  en: [
    "If you are looking for a fascinating story that will completely hook you, you cannot miss {Title}. Here is its main plot: ",
    "Dive into the exciting plot of {Title}, a work that is already making waves. Here are the key details of its story: ",
    "Ready for your next favorite read? {Title} has arrived to surprise you. Discover what it is about in this synopsis: ",
    "Explore the incredible universe of {Title}. We invite you to read the official plot summary of this great work: ",
    "For fans of great storytelling, {Title} is a highly recommended read. Here is a brief look at its premise: "
  ],
  pt: [
    "Se você está procurando uma história fascinante que vai te prender do início ao fim, não pode perder {Title}. A seguir, compartilhamos seu enredo principal: ",
    "Mergulhe na trama emocionante de {Title}, uma obra que já está dando o que falar. Aqui estão os detalhes principais da história: ",
    "Pronto para começar uma nova leitura? {Title} chega à nossa plataforma para te surpreender. Descubra do que se trata nesta sinopse: ",
    "Explore o incrível universo proposto por {Title}. Convidamos você a ler o resumo oficial desta grande obra: ",
    "Para os amantes de boas histórias, {Title} é uma recomendação imperdível. Contamos um pouco sobre o seu enredo: "
  ]
};

const OUTRO_TEMPLATES: Record<"es" | "pt" | "en", string[]> = {
  es: [
    " No te pierdas ningún capítulo de {Title} gratis y con la mejor calidad en MangaStoon.",
    " Sigue de cerca esta emocionante aventura y lee {Title} online de manera cómoda en nuestro lector.",
    " Disfruta de {Title} en español solo en MangaStoon, tu sitio de confianza para leer cómics y mangas.",
    " Mantente al día con todas las novedades y capítulos de {Title} aquí en MangaStoon.",
    " Lee {Title} online y únete a la comunidad de lectores que ya disfrutan de esta magnífica obra."
  ],
  en: [
    " Don't miss any chapter of {Title} for free and in the best quality on MangaStoon.",
    " Follow this exciting adventure closely and read {Title} online comfortably using our reader.",
    " Enjoy {Title} in English only on MangaStoon, your trusted site for comics and manga.",
    " Stay updated with all the chapters and latest releases of {Title} here on MangaStoon.",
    " Read {Title} online today and join the community of readers enjoying this amazing series."
  ],
  pt: [
    " Não perca nenhum capítulo de {Title} grátis e com a melhor qualidade no MangaStoon.",
    " Acompanhe de perto esta emocionante aventura e leia {Title} online com total conforto no nosso leitor.",
    " Divirta-se com {Title} em português no MangaStoon, o seu site favorito para ler quadrinhos e mangás.",
    " Fique por dentro de todas as novidades e novos capítulos de {Title} aqui no MangaStoon.",
    " Leia {Title} online agora mesmo e faça parte da comunidade de leitores desta incrível obra."
  ]
};

function getDeterministicIndex(seed: string, length: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % length;
}

export async function paraphraseSynopsis(
  text: string,
  targetLang: "es" | "pt" | "en",
  title: string,
  seedId: string,
  sourceLang = "auto"
): Promise<string> {
  const cleaned = sanitizeText(text);
  if (!cleaned) return "";

  let translated = cleaned;

  try {
    if (sourceLang === targetLang) {
      const pivotLang = targetLang === "en" ? "es" : "en";
      const intermediate = await forceTranslate(cleaned, pivotLang, targetLang);
      translated = await forceTranslate(intermediate, targetLang, pivotLang);
    } else {
      translated = await forceTranslate(cleaned, targetLang, sourceLang);
    }
  } catch {
    translated = cleaned;
  }

  const finalBody = translated || cleaned;

  const intros = INTRO_TEMPLATES[targetLang] || INTRO_TEMPLATES.es;
  const outros = OUTRO_TEMPLATES[targetLang] || OUTRO_TEMPLATES.es;

  const introIdx = getDeterministicIndex(seedId + "-intro", intros.length);
  const outroIdx = getDeterministicIndex(seedId + "-outro", outros.length);

  const introText = intros[introIdx].replace(/{Title}/g, title);
  const outroText = outros[outroIdx].replace(/{Title}/g, title);

  return `${introText}${finalBody}${outroText}`;
}


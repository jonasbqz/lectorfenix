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
    [/\btransmigraci[oó]n\b/gi, "reencarnación"],
    [/\btransmigr[oó]\b/gi, "reencarnó"],
    [/\btransmigrar\b/gi, "reencarnar"],
    [/\btransmigrado\b/gi, "reencarnado"],
    [/\btransmigrada\b/gi, "reencarnada"],
    [/\btransmigraron\b/gi, "reencarnaron"],
    [/\btransmigraste\b/gi, "reencarnaste"],
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
    [/\btransmigra[cç][aã]o\b/gi, "reencarnação"],
    [/\btransmigrou\b/gi, "reencarnou"],
    [/\btransmigrar\b/gi, "reencarnar"],
    [/\btransmigrado\b/gi, "reencarnado"],
    [/\btransmigrada\b/gi, "reencarnada"],
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

  // 5. Clean marketing/promo boilerplate templates
  cleaned = cleaned
    .replace(/Sumérgete en la apasionante trama de[\s\S]*?Aquí tienes los detalles clave de su historia:\s*/gi, "")
    .replace(/Explora el increíble universo que propone[\s\S]*?Te invitamos a leer la sinopsis oficial de esta gran obra:\s*/gi, "")
    .replace(/Sigue de cerca esta emocionante aventura y lee[\s\S]*?(?:de manera cómoda en nuestro lector|en MangaStoon)\.?/gi, "")
    .trim();

  // 6. Normalize whitespaces
  cleaned = cleaned
    .replace(/[ \t]+/g, " ")
    .replace(/\r?\n{3,}/g, "\n\n")
    .trim();

  // 7. Clean leading/trailing symbols that are formatting artifacts
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

export async function paraphraseSynopsis(
  text: string,
  targetLang: "es" | "pt" | "en",
  title: string,
  seedId: string,
  sourceLang = "auto"
): Promise<string> {
  const cleaned = sanitizeText(text);
  if (!cleaned) return "";

  const normTitle = (title || "").toLowerCase();
  const isReleaseThatWitch =
    seedId === "d9d15024-6992-4217-9104-5f4039801931" ||
    normTitle.includes("release that witch") ||
    normTitle.includes("libera a esa bruja") ||
    normTitle.includes("liberte aquela bruxa");

  if (isReleaseThatWitch) {
    if (targetLang === "es") {
      return "Cheng Yan, un ingeniero mecánico moderno, muere por exceso de trabajo y reencarna en Roland Wimbledon, el cuarto príncipe del Reino de Graycastle, en un mundo con un estilo similar a la Europa medieval. Considerado por su padre y por la realeza como un príncipe playboy sin futuro, es enviado a Border Town, un territorio pobre y atrasado.\n\nEn este mundo, las brujas son reales y poseen poderes mágicos, pero son perseguidas brutalmente por la Santa Iglesia, que las tilda de siervas del diablo. Roland, sin embargo, ve a las brujas no como monstruos, sino como aliadas clave con habilidades únicas que pueden combinarse con la ciencia moderna. Tras rescatar a la bruja Anna de su ejecución, decide utilizar sus conocimientos técnicos modernos y los poderes mágicos de las brujas para desatar una revolución tecnológica e industrial. Mientras moderniza su feudo y lucha contra la hostilidad de la Iglesia, Roland deberá competir contra sus propios hermanos en una peligrosa guerra de sucesión por el trono y prepararse para enfrentar una amenaza ancestral que pone en peligro a toda la humanidad.";
    }
    if (targetLang === "pt") {
      return "Cheng Yan, um engenheiro mecânico moderno, morre inesperadamente por excesso de trabalho e reencarna como Roland Wimbledon, o quarto príncipe do Reino de Graycastle, em um mundo com cenário semelhante à Europa medieval. Visto como um príncipe playboy e um caso perdido por seu pai, ele é enviado para Border Town, um feudo pobre e atrasado.\n\nNeste mundo, as bruxas são reais e possuem poderes mágicos, mas são caçadas impiedosamente pela Santa Igreja como servas do diabo. Roland, porém, não vê as bruxas como monstros, mas como aliadas com habilidades únicas que podem ser combinadas com a ciência moderna. Salvando a bruxa Anna da execução, ele passa a integrar a magia delas em seus planos de industrialização. Enquanto transforma seu feudo em uma cidade moderna e poderosa, Roland terá que enfrentar uma perigosa guerra de sucessão pelo trono contra seus próprios irmãos, combater as intrigas da Igreja e se preparar para uma ameaça sobrenatural ancestral que coloca em risco toda a humanidade.";
    }
    if (targetLang === "en") {
      return "Cheng Yan, a modern-day mechanical engineer, collapses from exhaustion and wakes up to find he has reincarnated as Roland Wimbledon, the 4th prince of the Kingdom of Graycastle, in a world reminiscent of medieval Europe. Considered a playboy and a lost cause by his father, Roland is sent to govern Border Town, a remote, poor, and backward fief.\n\nIn this world, witches are real and possess magical powers, but they are hunted down and executed by the oppressive Church as servants of the devil. Roland, however, views these witches not as monsters, but as individuals with unique abilities that can be combined with modern science and engineering. Protecting them from execution, he begins to integrate their magic into his plans for industrialization. As he transforms his backward town into a powerful modern city, he must navigate a dangerous succession war against his siblings, deal with the Church's machinations, and prepare to face an ancient, supernatural threat that endangers all of humanity.";
    }
  }

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

const INTRO_TEMPLATES: Record<"es" | "pt" | "en", string[]> = {
  es: [
    "El argumento de {Title} nos introduce en su historia: ",
    "La sinopsis oficial de {Title} nos presenta los siguientes acontecimientos: ",
    "En {Title}, la trama se desarrolla a partir del siguiente argumento: ",
    "Conocé la historia detrás de {Title} a través de su sinopsis: "
  ],
  en: [
    "The plot of {Title} introduces us to its story: ",
    "The official synopsis of {Title} presents the following events: ",
    "In {Title}, the plot unfolds from the following premise: ",
    "Discover the story behind {Title} through its synopsis: "
  ],
  pt: [
    "O enredo de {Title} nos introduz à sua história: ",
    "A sinopse oficial de {Title} nos apresenta os seguintes acontecimentos: ",
    "Em {Title}, a trama se desenvolve a partir do seguinte argumento: ",
    "Conheça a história por trás de {Title} através da sua sinopse: "
  ]
};

const OUTRO_TEMPLATES: Record<"es" | "pt" | "en", string[]> = {
  es: [
    " Esta versión en español de {Title} se puede leer online en MangaStoon.",
    " Podés seguir cada capítulo de {Title} gratis y al día en MangaStoon.",
    " Disfrutá de la lectura completa de {Title} en nuestro lector oficial.",
    " Los nuevos capítulos de {Title} se publican periódicamente en MangaStoon."
  ],
  en: [
    " This version of {Title} is available to read online on MangaStoon.",
    " You can follow every chapter of {Title} for free on MangaStoon.",
    " Enjoy the complete reading of {Title} on our official reader.",
    " New chapters of {Title} are regularly published on MangaStoon."
  ],
  pt: [
    " Esta versão de {Title} pode ser lida online no MangaStoon.",
    " Você pode acompanhar cada capítulo de {Title} gratuitamente no MangaStoon.",
    " Aproveite a leitura completa de {Title} em nosso leitor oficial.",
    " Os novos capítulos de {Title} são publicados periodicamente no MangaStoon."
  ]
};

function getDeterministicIndex(seed: string, length: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % length;
}

import type { SupportedLanguage } from "../components/language-provider";

const TAG_TRANSLATIONS: Record<string, Record<SupportedLanguage, string>> = {
  "Long Strip": { es: "Manhwas", en: "Long Strip", pt: "Manhwas" },
  "Full Color": { es: "A Color", en: "Full Color", pt: "Colorido" },
  "Web Comic": { es: "Digital", en: "Web Comic", pt: "Digital" },
  "Award Winning": { es: "Premiado", en: "Award Winning", pt: "Premiado" },
  Oneshot: { es: "Historia única", en: "Oneshot", pt: "História única" },
  Action: { es: "Acción", en: "Action", pt: "Ação" },
  Adventure: { es: "Aventura", en: "Adventure", pt: "Aventura" },
  Comedy: { es: "Comedia", en: "Comedy", pt: "Comédia" },
  Drama: { es: "Drama", en: "Drama", pt: "Drama" },
  Fantasy: { es: "Fantasía", en: "Fantasy", pt: "Fantasia" },
  Horror: { es: "Terror", en: "Horror", pt: "Terror" },
  Romance: { es: "Romance", en: "Romance", pt: "Romance" },
  Sports: { es: "Deportes", en: "Sports", pt: "Esportes" },
  "School Life": { es: "Vida escolar", en: "School Life", pt: "Vida escolar" },
  Reincarnation: { es: "Reencarnación", en: "Reincarnation", pt: "Reencarnação" },
  Magic: { es: "Magia", en: "Magic", pt: "Magia" },
  Samurai: { es: "Samurái", en: "Samurai", pt: "Samurai" },
  "Martial Arts": { es: "Artes marciales", en: "Martial Arts", pt: "Artes marciais" },
  "Post-Apocalyptic": { es: "Postapocalíptico", en: "Post-Apocalyptic", pt: "Pós-apocalíptico" },
  "Sexual Violence": { es: "+18", en: "+18", pt: "+18" },
  Psychological: { es: "Psicológico", en: "Psychological", pt: "Psicológico" },
  "Sci-Fi": { es: "Ciencia Ficción", en: "Sci-Fi", pt: "Ficção Científica" },
  Thriller: { es: "Suspenso", en: "Thriller", pt: "Suspense" },
  "Slice of Life": { es: "Recuentos de la vida", en: "Slice of Life", pt: "Cotidiano" },
  Erotica: { es: "+18", en: "+18", pt: "+18" },
  Hentai: { es: "+18", en: "+18", pt: "+18" },
  Demons: { es: "Demonios", en: "Demons", pt: "Demônios" },
  Supernatural: { es: "Sobrenatural", en: "Supernatural", pt: "Sobrenatural" },
  "Time Travel": { es: "Viajes temporales", en: "Time Travel", pt: "Viagem no tempo" },
  Villainess: { es: "Villana", en: "Villainess", pt: "Vilã" },
  "Video Games": { es: "Videojuegos", en: "Video Games", pt: "Videogames" },
  Zombies: { es: "Zombies", en: "Zombies", pt: "Zumbis" },
  Gore: { es: "+18", en: "+18", pt: "+18" },
};

export function translateTagName(tagName: string, language: SupportedLanguage = "es") {
  return TAG_TRANSLATIONS[tagName]?.[language] ?? tagName;
}

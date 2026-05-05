"use client";

import BackButton from "./BackButton";
import { useLanguage } from "./language-provider";
import SiteHeader from "./site-header";
import { legalContent, type LegalPageKey } from "../lib/legalContent";

type LegalTitle = Record<"es" | "en" | "pt", string>;

export default function LegalPage({
  pageKey,
  title,
}: {
  pageKey: LegalPageKey;
  title: LegalTitle;
}) {
  const { language } = useLanguage();
  const sections = legalContent[pageKey][language];

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-gray-300">
      <SiteHeader language={language} />

      <article className="mx-auto max-w-4xl px-4 py-12 md:px-8 md:py-16">
        <BackButton />

        <header className="mb-12 border-b border-white/10 pb-8">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-orange-500">
            MangaStoon Legal
          </p>
          <h1 className="text-4xl font-black leading-tight text-white md:text-5xl">
            {title[language]}
          </h1>
        </header>

        <div className="space-y-12">
          {sections.map((section) => (
            <section key={section.title} className="space-y-4">
              <h2 className="border-l-4 border-orange-500 pl-4 text-2xl font-bold text-white">
                {section.title}
              </h2>
              <div className="space-y-5 text-base leading-8 text-gray-300">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}

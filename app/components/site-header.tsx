"use client";

import Link from "next/link";
import { Compass } from "lucide-react";
import LanguagePreferencePicker from "./language-preference-picker";
import SearchBar from "./search-bar";
import AdultToggle from "./adult-toggle";

export type SupportedLanguage = "es" | "en" | "pt";

const UI_COPY: Record<
  SupportedLanguage,
  {
    explore: string;
  }
> = {
  es: {
    explore: "Explorar",
  },
  en: {
    explore: "Explore",
  },
  pt: {
    explore: "Explorar",
  },
};

export default function SiteHeader({ language }: { language: SupportedLanguage }) {
  const copy = UI_COPY[language];

  return (
    <header
      suppressHydrationWarning
      className="sticky top-0 z-50 border-b border-white/5 bg-[#141519]/92 backdrop-blur-xl"
    >
      <div
        suppressHydrationWarning
        className="mx-auto grid max-w-[1600px] grid-cols-1 gap-4 px-4 py-4 md:grid-cols-3 md:items-center md:px-8"
      >
        <div className="flex items-center justify-between gap-4 md:justify-start md:gap-8">
          <div className="flex items-center gap-4 md:gap-8">
            <Link
              href="/"
              className="text-2xl font-extrabold uppercase tracking-[0.08em] text-orange-500"
            >
              Mangastoon
            </Link>

            <Link
              href="/explore"
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-300 transition-colors hover:text-orange-500"
            >
              <Compass className="h-4 w-4" />
              <span className="hidden sm:inline">{copy.explore}</span>
            </Link>
          </div>
        </div>

        <div className="order-3 md:order-none flex w-full justify-center">
          <div className="w-full max-w-[500px]">
            <SearchBar />
          </div>
        </div>

        <div className="flex items-center justify-end gap-4">
          <LanguagePreferencePicker />
          <AdultToggle language={language} />
        </div>
      </div>
    </header>
  );
}

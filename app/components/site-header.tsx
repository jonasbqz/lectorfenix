"use client";

import Link from "next/link";
import { Compass, Heart } from "lucide-react";
import BrandLogo from "./BrandLogo";
import LanguagePreferencePicker from "./language-preference-picker";
import SearchBar from "./search-bar";
import AdultToggle from "./adult-toggle";

export type SupportedLanguage = "es" | "en" | "pt";

const UI_COPY: Record<
  SupportedLanguage,
  {
    explore: string;
    favorites: string;
  }
> = {
  es: {
    explore: "Explorar",
    favorites: "Guardados",
  },
  en: {
    explore: "Explore",
    favorites: "Saved",
  },
  pt: {
    explore: "Explorar",
    favorites: "Salvos",
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
        className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3 sm:px-5 md:grid md:grid-cols-[auto_minmax(280px,500px)_auto] md:items-center md:gap-6 md:px-8"
      >
        <div className="flex min-w-0 items-center justify-between gap-3 md:justify-start md:gap-8">
          <div className="flex min-w-0 items-center gap-4.5 md:gap-8">
            <BrandLogo />

            <Link
              href="/explore"
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-300 transition-colors hover:text-orange-500"
            >
              <Compass className="w-6 h-6" />
              <span className="hidden sm:inline">{copy.explore}</span>
            </Link>

            <Link
              href="/favoritos"
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-300 transition-colors hover:text-orange-500"
              aria-label={copy.favorites}
            >
              <Heart className="w-6 h-6" />
              <span className="hidden lg:inline">{copy.favorites}</span>
            </Link>
          </div>

          <div className="flex shrink-0 items-center gap-2 md:hidden">
            <LanguagePreferencePicker />
            <AdultToggle language={language} />
          </div>
        </div>

        <div className="flex w-full justify-center">
          <div className="w-full max-w-[500px]">
            <SearchBar />
          </div>
        </div>

        <div className="hidden items-center justify-end gap-4 md:flex">
          <LanguagePreferencePicker />
          <AdultToggle language={language} />
        </div>
      </div>
    </header>
  );
}

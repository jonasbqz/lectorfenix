"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, X } from "lucide-react";
import { useHistoryStore } from "../store/useHistoryStore";
import { buildChapterPath } from "../utils/slugify";
import { useLanguage } from "./language-provider";

import { getOptimizedImageUrl } from "../utils/image";

function formatChapterLabel(chapterNumber: string) {
  return chapterNumber ? `Capítulo ${chapterNumber}` : "Continuar leyendo";
}

function normalizeStoredCoverImage(value: string) {
  if (!value) return value;
  return getOptimizedImageUrl(value);
}

function formatRelativeTime(timestamp: number, language: string): string {
  if (!timestamp) return "";
  const diffMs = Math.max(0, Date.now() - timestamp);
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (language === "en") {
    if (diffYear >= 1) return `Read ${diffYear} year${diffYear === 1 ? "" : "s"} ago`;
    if (diffMonth >= 1) return `Read ${diffMonth} month${diffMonth === 1 ? "" : "s"} ago`;
    if (diffDay >= 1) {
      if (diffDay === 1) return "Read yesterday";
      return `Read ${diffDay} days ago`;
    }
    if (diffHr >= 1) return `Read ${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
    if (diffMin >= 1) return `Read ${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
    return "Read just now";
  } else if (language === "pt") {
    if (diffYear >= 1) return `Lido há ${diffYear} ano${diffYear === 1 ? "" : "s"}`;
    if (diffMonth >= 1) return `Lido há ${diffMonth} me${diffMonth === 1 ? "s" : "ses"}`;
    if (diffDay >= 1) {
      if (diffDay === 1) return "Lido ontem";
      return `Lido há ${diffDay} dias`;
    }
    if (diffHr >= 1) return `Lido há ${diffHr} hora${diffHr === 1 ? "" : "s"}`;
    if (diffMin >= 1) return `Lido há ${diffMin} minuto${diffMin === 1 ? "" : "s"}`;
    return "Lido agora mesmo";
  } else { // Neutral Spanish
    if (diffYear >= 1) return `Leído hace ${diffYear} año${diffYear === 1 ? "" : "s"}`;
    if (diffMonth >= 1) return `Leído hace ${diffMonth} me${diffMonth === 1 ? "s" : "ses"}`;
    if (diffDay >= 1) {
      if (diffDay === 1) return "Leído ayer";
      return `Leído hace ${diffDay} días`;
    }
    if (diffHr >= 1) return `Leído hace ${diffHr} hora${diffHr === 1 ? "" : "s"}`;
    if (diffMin >= 1) return `Leído hace ${diffMin} minuto${diffMin === 1 ? "" : "s"}`;
    return "Leído recién";
  }
}

export default function ReadingHistoryList() {
  const [mounted, setMounted] = useState(false);
  const history = useHistoryStore((state) => state.history);
  const removeHistory = useHistoryStore((state) => state.removeHistory);
  const { language } = useLanguage();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || history.length === 0) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#181920]/80 to-[#0e0f13]/90 p-5 shadow-2xl shadow-black/40 md:p-6 backdrop-blur-md">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="border-l-4 border-amber-500 pl-3.5">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white font-heading">Continuar Leyendo</h2>
          <p className="mt-1 text-xs md:text-sm text-neutral-400">Regresa directo al capítulo donde te quedaste.</p>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory [scrollbar-width:thin] [scrollbar-color:#f59e0b_rgba(255,255,255,0.03)]">
        {history.map((item) => (
          <article
            key={`${item.mangaId}-${item.chapterId}`}
            className="group relative min-w-[270px] max-w-[310px] snap-start"
          >
            <Link
              href={buildChapterPath(item.mangaTitle, item.mangaId, item.chapterId)}
              className="flex items-center gap-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5 pr-12 transition-all duration-300 hover:border-amber-500/40 hover:bg-gradient-to-r hover:from-amber-500/[0.04] hover:to-transparent hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)] hover:scale-[1.01]"
            >
              <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-white/10 shadow-md">
                {item.coverImage ? (
                  <Image
                    src={normalizeStoredCoverImage(item.coverImage)}
                    alt={item.mangaTitle}
                    fill
                    sizes="56px"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    unoptimized
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-amber-500">
                    <BookOpen size={20} />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1 flex flex-col justify-center">
                <h3 className="line-clamp-2 text-sm font-bold leading-snug text-neutral-100 group-hover:text-white transition-colors duration-200">
                  {item.mangaTitle}
                </h3>
                <div className="mt-2.5 flex flex-col gap-1.5">
                  <span className="inline-flex w-fit items-center rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-amber-400 leading-none select-none">
                    {formatChapterLabel(item.chapterNumber)}
                  </span>
                  {item.timestamp && (
                    <span className="text-[10px] text-neutral-500 font-medium">
                      {formatRelativeTime(item.timestamp, language)}
                    </span>
                  )}
                </div>
              </div>
            </Link>

            <button
              type="button"
              aria-label={`Quitar ${item.mangaTitle} de continuar leyendo`}
              onClick={() => removeHistory(item.mangaId)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-neutral-950/80 text-gray-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 shadow-md backdrop-blur transition-all duration-200 opacity-100 sm:opacity-0 group-hover:opacity-100 z-10 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

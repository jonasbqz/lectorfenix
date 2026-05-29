"use client";

import { BookOpen } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { buildChapterPath } from "../utils/slugify";

type ReadingProgress = {
  mangaId: string;
  mangaTitle: string;
  chapterId: string;
  chapterLabel: string;
  updatedAt: string;
};

const READING_PROGRESS_KEY = "mangastoon_reading_progress";

function readProgressMap() {
  try {
    return JSON.parse(localStorage.getItem(READING_PROGRESS_KEY) ?? "{}") as Record<
      string,
      ReadingProgress
    >;
  } catch {
    return {};
  }
}

export default function ContinueReadingButton({
  mangaId,
  mangaTitle,
  language,
  firstChapterId,
}: {
  mangaId: string;
  mangaTitle?: string;
  language?: string;
  firstChapterId?: string;
}) {
  const [progress, setProgress] = useState<ReadingProgress | null>(null);

  useEffect(() => {
    setProgress(readProgressMap()[mangaId] ?? null);
  }, [mangaId]);

  const chId = progress?.chapterId ?? firstChapterId;

  if (!chId) {
    return null;
  }

  const labelText = progress
    ? (language === "pt"
        ? `Continuar lendo - ${progress.chapterLabel}`
        : language === "en"
          ? `Continue reading - ${progress.chapterLabel}`
          : `Continuar leyendo - ${progress.chapterLabel}`)
    : (language === "pt"
        ? "Começar a ler"
        : language === "en"
          ? "Read now"
          : "Empezar a leer");

  return (
    <Link
      href={buildChapterPath(mangaTitle || progress?.mangaTitle, mangaId, chId, language)}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff6b00] to-[#ff8833] px-4 py-3.5 text-sm font-heading font-bold text-black transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-[0_4px_20px_rgba(255,107,0,0.25)] hover:shadow-[0_4px_25px_rgba(255,107,0,0.4)]"
    >
      <BookOpen className="h-4 w-4" />
      <span>{labelText}</span>
    </Link>
  );
}

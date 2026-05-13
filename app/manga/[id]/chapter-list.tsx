"use client";

import Link from "next/link";
import { BookOpen, CalendarDays } from "lucide-react";
import { useState } from "react";

type ChapterRow = {
  chapter: {
    id: string;
  };
  chapterLabel: string;
  publishedLabel: string;
};

type ChapterListProps = {
  mangaId: string;
  chapterRows: ChapterRow[];
  showMoreLabel: string;
};

const INITIAL_CHAPTER_COUNT = 10;
const CHAPTER_INCREMENT = 10;

export default function ChapterList({ mangaId, chapterRows, showMoreLabel }: ChapterListProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_CHAPTER_COUNT);
  const visibleRows = chapterRows.slice(0, visibleCount);
  const hasMore = visibleCount < chapterRows.length;

  return (
    <div>
      {visibleRows.map(({ chapter, chapterLabel, publishedLabel }) => (
        <Link
          key={chapter.id}
          href={`/read/${mangaId}?chapter=${chapter.id}`}
          className="animate-soft-enter mb-2 flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/5 p-4 transition-colors hover:bg-white/10"
        >
          <div className="flex min-w-0 items-center gap-3">
            <BookOpen className="h-5 w-5 shrink-0 text-[#ff6b00]" />
            <p className="text-base font-semibold text-white">{chapterLabel}</p>
          </div>

          <div className="ml-2 flex shrink-0 items-center gap-2 text-sm text-gray-400">
            <CalendarDays className="h-4 w-4" />
            <span>{publishedLabel}</span>
          </div>
        </Link>
      ))}

      {hasMore ? (
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + CHAPTER_INCREMENT)}
            className="rounded-full border border-orange-500/40 bg-orange-500/10 px-5 py-2.5 text-sm font-semibold text-orange-300 transition hover:border-orange-400 hover:bg-orange-500 hover:text-white"
          >
            {showMoreLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}

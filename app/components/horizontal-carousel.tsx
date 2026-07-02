"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MangaCard, type MangaShowcaseItem } from "./home-carousel";

export default function HorizontalCarousel({
  title,
  mangas,
  featuredCards = false,
  subtitle,
  showChapters = false,
  autoAdvance = false,
}: {
  title: string;
  mangas: MangaShowcaseItem[];
  featuredCards?: boolean;
  subtitle?: string;
  showChapters?: boolean;
  autoAdvance?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtStart, setIsAtStart] = useState(true);
  const [isAtEnd, setIsAtEnd] = useState(false);

  function checkScroll() {
    if (!scrollRef.current) return;

    const { scrollLeft, clientWidth, scrollWidth } = scrollRef.current;
    setIsAtStart(scrollLeft <= 0);
    setIsAtEnd(scrollLeft + clientWidth >= scrollWidth - 1);
  }

  function scrollByAmount(direction: "left" | "right") {
    if (!scrollRef.current) return;

    const amount = Math.round(scrollRef.current.clientWidth * 0.85);
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  }

  useEffect(() => {
    checkScroll();
  }, [mangas]);

  useEffect(() => {
    if (!autoAdvance || mangas.length <= 1) return;

    const interval = window.setInterval(() => {
      const container = scrollRef.current;
      if (!container) return;

      const firstCard = container.querySelector<HTMLElement>("[data-carousel-card]");
      const step = firstCard ? firstCard.offsetWidth + 24 : Math.round(container.clientWidth * 0.85);
      const shouldLoop = container.scrollLeft + container.clientWidth >= container.scrollWidth - step;

      container.scrollTo({
        left: shouldLoop ? 0 : container.scrollLeft + step,
        behavior: "smooth",
      });
    }, 7000);

    return () => window.clearInterval(interval);
  }, [autoAdvance, mangas.length]);

  if (mangas.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-6 w-1.5 rounded-full bg-[#ff6b00] md:h-8" />
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">{title}</h2>
            <p className="text-xs text-gray-400">{subtitle ?? "Descubre algo grande para leer ahora"}</p>
          </div>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <button
            type="button"
            onClick={() => scrollByAmount("left")}
            disabled={isAtStart}
            className="rounded-full bg-white/5 p-2 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollByAmount("right")}
            disabled={isAtEnd}
            className="rounded-full bg-white/5 p-2 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="scrollbar-hide -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4 [&::-webkit-scrollbar]:hidden md:mx-0 md:gap-6 md:px-0"
      >
        {mangas.map((manga, index) => (
          <div
            key={manga.mangaDexId ? `${manga.mangaDexId}-${index}` : `${manga.mal_id}-${index}`}
            data-carousel-card
            className="shrink-0"
          >
            <MangaCard
              manga={manga}
              isFeatured={featuredCards}
              showChapters={showChapters}
              latestChapters={manga.latestChapters}
              priorityImage={index < 4}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

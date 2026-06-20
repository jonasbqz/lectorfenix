"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { getOptimizedImageUrl } from "../../utils/image";

const MAX_RETRIES = 2;

function withRetryParam(src: string, retry: number) {
  if (!src) return src;

  const separator = src.includes("?") ? "&" : "?";
  return `${src}${separator}retry=${retry}_${Date.now()}`;
}

const PLACEHOLDER_TEXT = {
  es: "Sin Portada",
  en: "No Cover",
  pt: "Sem Capa",
};

function CoverPlaceholder({ title, language }: { title: string; language: string }) {
  const label = PLACEHOLDER_TEXT[language as keyof typeof PLACEHOLDER_TEXT] ?? PLACEHOLDER_TEXT.es;
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1c1d22] border border-white/5 p-4 text-center select-none">
      <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-amber-500/5 to-transparent pointer-events-none" />
      
      {/* Decorative Book Icon */}
      <div className="relative mb-3 flex h-16 w-12 items-center justify-center rounded border border-white/10 bg-white/[0.02] shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
        <div className="absolute left-1.5 top-0 bottom-0 w-0.5 bg-white/10" />
        <div className="flex flex-col gap-1 w-6 opacity-30">
          <div className="h-0.5 bg-white rounded-full" />
          <div className="h-0.5 bg-white rounded-full w-2/3" />
          <div className="h-0.5 bg-white rounded-full w-4/5" />
        </div>
      </div>

      <div className="text-[10px] font-extrabold uppercase tracking-widest text-amber-500/80 mb-1.5 font-heading">
        {label}
      </div>
      <div className="text-xs font-bold text-neutral-400 line-clamp-2 px-1 max-w-full leading-snug">
        {title}
      </div>
    </div>
  );
}

export default function ComicCoverImage({
  src,
  alt,
  title,
  language = "es",
}: {
  src?: string | null;
  alt: string;
  title: string;
  language?: string;
}) {
  const [currentSrc, setCurrentSrc] = useState<string | null>(() => src ? getOptimizedImageUrl(src) : null);
  const [retryCount, setRetryCount] = useState(0);
  const [hasFailed, setHasFailed] = useState(!src);

  useEffect(() => {
    setCurrentSrc(src ? getOptimizedImageUrl(src) : null);
    setRetryCount(0);
    setHasFailed(!src);
  }, [src]);

  if (hasFailed || !currentSrc) {
    return <CoverPlaceholder title={title} language={language} />;
  }

  return (
    <Image
      src={currentSrc}
      alt={alt}
      fill
      sizes="(max-width: 640px) 112px, (max-width: 768px) 150px, 320px"
      className="object-cover object-top"
      priority
      referrerPolicy="no-referrer"
      onError={() => {
        if (retryCount < MAX_RETRIES) {
          const nextRetry = retryCount + 1;
          setRetryCount(nextRetry);
          setCurrentSrc(getOptimizedImageUrl(withRetryParam(src || "", nextRetry)));
        } else {
          setHasFailed(true);
        }
      }}
    />
  );
}

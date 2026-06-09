"use client";

import Image from "next/image";
import { useState, useEffect } from "react";

const MAX_RETRIES = 2;

function withRetryParam(src: string, retry: number) {
  if (!src) return src;

  const separator = src.includes("?") ? "&" : "?";
  return `${src}${separator}retry=${retry}_${Date.now()}`;
}

export default function ComicCoverImage({
  src,
  fallbackSrc,
  alt,
}: {
  src: string;
  fallbackSrc?: string;
  alt: string;
}) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setCurrentSrc(src);
    setRetryCount(0);
  }, [src]);

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
        if (fallbackSrc && currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
          setRetryCount(0);
          return;
        }

        if (retryCount < MAX_RETRIES) {
          const nextRetry = retryCount + 1;
          setRetryCount(nextRetry);
          setCurrentSrc(withRetryParam(src, nextRetry));
        }
      }}
    />
  );
}

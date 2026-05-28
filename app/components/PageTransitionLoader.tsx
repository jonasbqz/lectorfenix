"use client";

import { useEffect, useState, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import MangaLoader from "./MangaLoader";

function TransitionLoaderEvents() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  // Turn off loading once pathname or search parameters change (navigation completes)
  useEffect(() => {
    setIsLoading(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");

      if (!anchor) return;

      const href = anchor.getAttribute("href");
      const targetAttr = anchor.getAttribute("target");

      // We only intercept internal relative links that don't open in a new tab/window
      if (
        href &&
        href.startsWith("/") &&
        !href.startsWith("/#") &&
        targetAttr !== "_blank" &&
        e.button === 0 && // Left click only
        !e.metaKey &&
        !e.ctrlKey &&
        !e.shiftKey &&
        !e.altKey
      ) {
        const currentUrl = window.location.pathname + window.location.search;
        const cleanHref = href.split("#")[0];

        // Trigger loader only if actually navigating to a different page/search state
        if (currentUrl !== cleanHref) {
          setIsLoading(true);
        }
      }
    };

    const handlePopState = () => {
      // Show loader on browser back/forward navigation
      setIsLoading(true);
    };

    document.addEventListener("click", handleAnchorClick);
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("click", handleAnchorClick);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  if (!isLoading) return null;

  return <MangaLoader fullScreen />;
}

export default function PageTransitionLoader() {
  return (
    <Suspense fallback={null}>
      <TransitionLoaderEvents />
    </Suspense>
  );
}

"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import MangaLoader from "./MangaLoader";

function TransitionLoaderEvents() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const loaderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLoaderTimer = () => {
    if (loaderTimerRef.current) {
      clearTimeout(loaderTimerRef.current);
      loaderTimerRef.current = null;
    }
  };

  const showLoaderSoon = () => {
    clearLoaderTimer();
    loaderTimerRef.current = setTimeout(() => {
      setIsLoading(true);
      loaderTimerRef.current = null;
    }, 180);
  };

  const hideLoader = () => {
    clearLoaderTimer();
    setIsLoading(false);
  };

  // Turn off loading once pathname or search parameters change (navigation completes)
  useEffect(() => {
    hideLoader();
  }, [pathname, searchParams]);

  // Safety timeout to prevent getting stuck in loading state (e.g. on network failures)
  useEffect(() => {
    if (!isLoading) return;

    const safetyTimer = setTimeout(() => {
      setIsLoading(false);
      console.warn("[PageTransitionLoader] Loading timed out after 8s safety limit.");
    }, 8000);

    return () => clearTimeout(safetyTimer);
  }, [isLoading]);

  useEffect(() => () => clearLoaderTimer(), []);

  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");

      if (!anchor) return;

      const href = anchor.getAttribute("href");
      const targetAttr = anchor.getAttribute("target");
      const downloadAttr = anchor.getAttribute("download");

      // Check if it's explicitly marked to skip loading (e.g. custom action)
      if (anchor.hasAttribute("data-no-transition-loader")) return;

      // We only intercept internal relative links that don't open in a new tab/window and are not downloads
      if (
        href &&
        href.startsWith("/") &&
        !href.startsWith("/#") &&
        targetAttr !== "_blank" &&
        downloadAttr === null &&
        e.button === 0 && // Left click only
        !e.metaKey &&
        !e.ctrlKey &&
        !e.shiftKey &&
        !e.altKey
      ) {
        try {
          const resolvedUrl = new URL(href, window.location.href);
          const targetPath = resolvedUrl.pathname;
          const currentPath = window.location.pathname;

          // Trigger loader only if actually navigating to a different page path
          if (targetPath !== currentPath) {
            showLoaderSoon();
          }
        } catch (err) {
          console.warn("[PageTransitionLoader] Error parsing click URL:", err);
        }
      }
    };

    const handleNavigation = (url: string | URL | null | undefined) => {
      if (!url) return;
      try {
        const resolvedUrl = new URL(url.toString(), window.location.href);
        const targetPath = resolvedUrl.pathname;
        const currentPath = window.location.pathname;

        if (targetPath !== currentPath) {
          queueMicrotask(showLoaderSoon);
        }
      } catch (err) {
        console.warn("[PageTransitionLoader] Error parsing History URL:", err);
      }
    };

    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function (state, unused, url) {
      handleNavigation(url);
      return originalPushState.apply(this, [state, unused, url]);
    };

    window.history.replaceState = function (state, unused, url) {
      handleNavigation(url);
      return originalReplaceState.apply(this, [state, unused, url]);
    };

    const handlePopState = () => {
      // Show loader on browser back/forward navigation
      queueMicrotask(showLoaderSoon);
    };

    document.addEventListener("click", handleAnchorClick);
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("click", handleAnchorClick);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
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

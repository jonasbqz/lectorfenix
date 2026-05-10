"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";

export default function AdManager() {
  const pathname = usePathname();

  // Lista de rutas "limpias" donde NO queremos que salte el anuncio (Inicio, explorar, favoritos)
  const isCleanRoute = pathname === "/" || pathname === "/explore" || pathname === "/favoritos";

  if (isCleanRoute) {
    return null;
  }

  return (
    <Script
      id="monetag-vignette"
      src="https://dd133.com/vignette.min.js"
      data-zone="10986315"
      strategy="afterInteractive"
    />
  );
}

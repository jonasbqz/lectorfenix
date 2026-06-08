"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "../../utils/supabase/client";

const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutos
const LAST_SHOW_KEY = "mangastoon_last_ad_time";

export default function MangastoonProvider() {
  const pathname = usePathname();
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    async function checkMonetizationState() {
      // Solo cargar publicidad en las páginas de cómic (detalle/preview y lector de capítulos).
      // Estas páginas tienen rutas que empiezan con "/comics/".
      // Evitamos cargar publicidad en el Home (/), explorar, perfil, favoritos, etc.
      if (!pathname.startsWith("/comics/")) {
        setShouldLoad(false);
        return;
      }

      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          // Verificar si el usuario es premium
          const { data: profile } = await supabase
            .from("profiles")
            .select("is_premium")
            .eq("id", user.id)
            .maybeSingle();

          if (profile?.is_premium) {
            // Usuario Premium: no cargamos nada de publicidad
            setShouldLoad(false);
            return;
          }
        }

        // Para incentivar la suscripción Premium, removemos el cooldown
        // de 10 minutos para que los anuncios aparezcan en cada navegación.
        setShouldLoad(true);
      } catch (error) {
        console.warn("[MangastoonProvider] Error checking monetization, falling back to show ads:", error);
        setShouldLoad(true);
      }
    }

    checkMonetizationState();
  }, [pathname]);

  // ─── ANUNCIOS ACTIVADOS ──────────────────────────────────────────────────
  useEffect(() => {
    if (!shouldLoad) return;

    let active = true;
    const scriptsToClean: HTMLScriptElement[] = [];

    async function loadDynamicAds() {
      try {
        const res = await fetch("/api/ads/tag");
        if (!res.ok) return;
        const data = await res.json();
        if (!active || !data.tag) return;

        // Parse HTML and extract script tags
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = data.tag;

        const originalScripts = Array.from(tempDiv.querySelectorAll("script"));
        originalScripts.forEach((oldScript) => {
          const newScript = document.createElement("script");
          
          // Copy all attributes
          Array.from(oldScript.attributes).forEach((attr) => {
            newScript.setAttribute(attr.name, attr.value);
          });
          
          // Copy content if inline script
          if (oldScript.innerHTML) {
            newScript.innerHTML = oldScript.innerHTML;
          }
          
          document.head.appendChild(newScript);
          scriptsToClean.push(newScript);
        });
      } catch (err) {
        console.warn("[MangastoonProvider] Error loading dynamic ads:", err);
      }
    }

    loadDynamicAds();

    return () => {
      active = false;
      scriptsToClean.forEach((script) => script.remove());
    };
  }, [shouldLoad]);

  return null;
}

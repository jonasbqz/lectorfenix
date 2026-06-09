"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "../../utils/supabase/client";

// Generar o recuperar session_id único de forma segura para la pestaña actual
const getSessionId = (): string => {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem("mangastoon_session_id");
  if (!id) {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      id = crypto.randomUUID();
    } else {
      id = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    }
    sessionStorage.setItem("mangastoon_session_id", id);
  }
  return id;
};

// Detección simple y efectiva de AdBlocker
const checkAdblock = async (): Promise<boolean> => {
  if (typeof window === "undefined") return false;
  try {
    const res = await fetch("/api/ads/tag", { method: "HEAD", cache: "no-store" });
    return !res.ok;
  } catch (e) {
    return true; // Falla por bloqueo de red (AdBlocker activo)
  }
};

export default function HeartbeatTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const supabase = createClient();
    const sessionId = getSessionId();

    // Registrar funciones globales de trackeo para robar más ideas a Google Analytics
    (window as any).trackStoonEvent = async (eventName: string, eventData: any = {}) => {
      try {
        await fetch("/api/analytics/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "event",
            session_id: sessionId,
            event_name: eventName,
            event_data: eventData
          })
        });
      } catch (e) {
        console.warn("[StoonAnalytics] Error sending custom event:", e);
      }
    };

    (window as any).trackStoonPerformance = async (mangaId: string, chapterId: string, imageUrl: string, loadTimeMs: number, success: boolean = true) => {
      try {
        await fetch("/api/analytics/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "performance",
            session_id: sessionId,
            manga_id: mangaId,
            chapter_id: chapterId,
            image_url: imageUrl,
            load_time_ms: loadTimeMs,
            success
          })
        });
      } catch (e) {
        console.warn("[StoonAnalytics] Error sending performance metric:", e);
      }
    };

    const initializeAnalytics = async () => {
      // 1. Enviar session_start si no se inició en esta pestaña
      const sessionStarted = sessionStorage.getItem("stoon_session_started");
      if (!sessionStarted) {
        const hasAdblocker = await checkAdblock();
        try {
          await fetch("/api/analytics/track", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "session_start",
              session_id: sessionId,
              referrer: document.referrer || null,
              has_adblocker: hasAdblocker
            })
          });
          sessionStorage.setItem("stoon_session_started", "true");
        } catch (e) {
          console.warn("[StoonAnalytics] Error initializing session:", e);
        }
      }

      // 2. Enviar pageview para la ruta actual
      try {
        let mangaId: string | null = null;
        let chapterId: string | null = null;

        // Extraer IDs si estamos en páginas de detalles de cómics o lectura
        const parts = pathname.split("/");
        if (pathname.startsWith("/comics/") || pathname.startsWith("/manga/")) {
          mangaId = parts[2] || null;
          if (parts[3] === "chapters" || parts[3] === "read") {
            chapterId = parts[4] || null;
          }
        }

        await fetch("/api/analytics/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "pageview",
            session_id: sessionId,
            path: pathname,
            manga_id: mangaId,
            chapter_id: chapterId
          })
        });
      } catch (e) {
        console.warn("[StoonAnalytics] Error recording pageview:", e);
      }

      // 3. Registrar presencia tradicional (para ver activos en vivo en el dashboard)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id || null;

        await supabase.from("user_presence").upsert({
          session_id: sessionId,
          user_id: userId,
          path: pathname,
          last_active: new Date().toISOString(),
        }, {
          onConflict: "session_id",
        });
      } catch (err) {
        console.warn("[Heartbeat] Traditional presence exception:", err);
      }
    };

    // Inicializar sesión y vistas al montar la ruta
    initializeAnalytics();

    // 4. Ping periódico cada 30 segundos (Heartbeat de duración de página y presencia activa)
    const sendHeartbeat = async () => {
      try {
        // Enviar heartbeat nativo para tiempo de lectura
        await fetch("/api/analytics/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "heartbeat",
            session_id: sessionId,
            path: pathname
          })
        });

        // Actualizar presencia en vivo en la base de datos
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id || null;
        await supabase.from("user_presence").upsert({
          session_id: sessionId,
          user_id: userId,
          path: pathname,
          last_active: new Date().toISOString(),
        }, {
          onConflict: "session_id",
        });
      } catch (e) {
        console.warn("[StoonAnalytics] Heartbeat error:", e);
      }
    };

    const interval = setInterval(sendHeartbeat, 30000); // Heartbeat cada 30 segundos

    return () => {
      clearInterval(interval);
    };
  }, [pathname]);

  return null;
}

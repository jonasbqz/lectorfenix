"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// Generar o recuperar session_id único de forma segura para la pestaña actual
const getSessionId = (): string => {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem("lectorfenix_session_id");
  if (!id) {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      id = crypto.randomUUID();
    } else {
      id = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    }
    sessionStorage.setItem("lectorfenix_session_id", id);
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
  
  // Referencias para acumular analíticas en lote y medir tiempos de lectura de forma local
  const queueRef = useRef<any[]>([]);
  const startTimeRef = useRef<number>(Date.now());
  const currentPathRef = useRef<string>(pathname);

  // Función para procesar y enviar la cola acumulada
  const flushQueue = async (isSync = false) => {
    if (queueRef.current.length === 0) return;
    
    const payload = [...queueRef.current];
    queueRef.current = []; // Vaciar cola local de inmediato para evitar envíos dobles

    try {
      const url = "/api/analytics/track";
      const body = JSON.stringify(payload);

      if (isSync && typeof navigator !== "undefined" && navigator.sendBeacon) {
        // Usar sendBeacon para envíos fiables antes del cierre de pestaña
        const blob = new Blob([body], { type: "application/json" });
        navigator.sendBeacon(url, blob);
      } else {
        // Envío asíncrono normal
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true // Mantiene la conexión abierta si la pestaña está cerrándose
        });
      }
    } catch (e) {
      console.warn("[StoonAnalytics] Failed to flush queue:", e);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const sessionId = getSessionId();
    startTimeRef.current = Date.now();
    currentPathRef.current = pathname;

    // Encolar evento personalizado
    (window as any).trackStoonEvent = (eventName: string, eventData: any = {}) => {
      queueRef.current.push({
        type: "event",
        session_id: sessionId,
        event_name: eventName,
        event_data: eventData
      });
      // Flush rápido de eventos específicos para tener feedback instantáneo
      flushQueue();
    };

    // Encolar rendimiento de carga de imágenes con muestreo del 5% en el cliente
    (window as any).trackStoonPerformance = (mangaId: string, chapterId: string, imageUrl: string, loadTimeMs: number, success: boolean = true) => {
      // Muestreo en el cliente: Descartar el 95% de las llamadas de velocidad de imágenes
      if (Math.random() > 0.05) return;

      queueRef.current.push({
        type: "performance",
        session_id: sessionId,
        manga_id: mangaId,
        chapter_id: chapterId,
        image_url: imageUrl,
        load_time_ms: loadTimeMs,
        success
      });
      
      // Acumular y enviar en lote si se juntan más de 5 registros de performance
      if (queueRef.current.length >= 5) {
        flushQueue();
      }
    };

    const initializeAnalytics = async () => {
      // 1. Enviar session_start si es pestaña nueva
      const sessionStarted = sessionStorage.getItem("stoon_session_started");
      if (!sessionStarted) {
        const hasAdblocker = await checkAdblock();
        queueRef.current.push({
          type: "session_start",
          session_id: sessionId,
          referrer: document.referrer || null,
          has_adblocker: hasAdblocker
        });
        sessionStorage.setItem("stoon_session_started", "true");
      }

      // 2. Encolar la vista de página para la ruta actual
      let mangaId: string | null = null;
      let chapterId: string | null = null;

      const parts = pathname.split("/");
      if (pathname.startsWith("/comics/") || pathname.startsWith("/manga/")) {
        mangaId = parts[2] || null;
        if (parts[3] === "chapters" || parts[3] === "read") {
          chapterId = parts[4] || null;
        }
      }

      queueRef.current.push({
        type: "pageview",
        session_id: sessionId,
        path: pathname,
        manga_id: mangaId,
        chapter_id: chapterId
      });

      // Disparar envío del inicio/página vista
      flushQueue();
    };

    initializeAnalytics();

    // Loop de flush periódico de lote cada 30 segundos
    const flushInterval = setInterval(() => flushQueue(), 30000);

    // Al desmontar o cambiar de ruta, registrar la duración y enviar el lote final
    return () => {
      clearInterval(flushInterval);

      const secondsElapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
      if (secondsElapsed > 0) {
        queueRef.current.push({
          type: "heartbeat",
          session_id: sessionId,
          path: currentPathRef.current,
          secondsToAdd: secondsElapsed
        });
      }

      flushQueue();
    };
  }, [pathname]);

  // Hook global para registrar el cierre final de la pestaña/navegador (beforeunload)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBeforeUnload = () => {
      const sessionId = getSessionId();
      const secondsElapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
      
      if (secondsElapsed > 0) {
        queueRef.current.push({
          type: "heartbeat",
          session_id: sessionId,
          path: currentPathRef.current,
          secondsToAdd: secondsElapsed
        });
      }
      
      // Forzar envío síncrono fiable en el cierre de la ventana
      flushQueue(true);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  return null;
}

import { NextRequest, NextResponse } from "next/server";
import { sql } from "../../../../utils/postgres/client";

export const dynamic = "force-dynamic";

// Parser de origen/fuente de tráfico basado en referrer
function parseSource(referrer: string | null): string {
  if (!referrer) return "Direct";
  try {
    const url = new URL(referrer);
    const host = url.hostname.toLowerCase();
    if (host.includes("google")) return "Google / Organic";
    if (host.includes("t.me") || host.includes("telegram")) return "Telegram / Community";
    if (host.includes("twitter") || host.includes("x.com")) return "Twitter / Social";
    if (host.includes("facebook")) return "Facebook";
    if (host.includes("discord")) return "Discord";
    return url.hostname;
  } catch (e) {
    return "Direct";
  }
}

// Parser de User-Agent para dispositivo y navegador
function parseUserAgent(ua: string | null) {
  if (!ua) return { device: "Desktop", browser: "Otros" };
  const lower = ua.toLowerCase();
  
  let device = "Desktop";
  if (lower.includes("ipad") || lower.includes("tablet") || (lower.includes("android") && !lower.includes("mobile"))) {
    device = "Tablet";
  } else if (lower.includes("mobile") || lower.includes("iphone") || lower.includes("android")) {
    device = "Mobile";
  }

  let browser = "Otros";
  if (lower.includes("chrome") || lower.includes("criod")) browser = "Chrome";
  else if (lower.includes("firefox")) browser = "Firefox";
  else if (lower.includes("safari") && !lower.includes("chrome")) browser = "Safari";
  else if (lower.includes("edge") || lower.includes("edg/")) browser = "Edge";
  else if (lower.includes("opera") || lower.includes("opr/")) browser = "Opera";

  return { device, browser };
}

async function ensureSessionExists(session_id: string, request: NextRequest) {
  try {
    const [existing] = await sql`
      SELECT session_id FROM public.analytics_sessions WHERE session_id = ${session_id} LIMIT 1
    ` as any[];

    if (!existing) {
      const userAgent = request.headers.get("user-agent") || "";
      const { device, browser } = parseUserAgent(userAgent);
      const country = 
        request.headers.get("x-vercel-ip-country") || 
        request.headers.get("cf-ipcountry") || 
        request.headers.get("x-real-ip-country") ||
        "Desconocido";

      await sql`
        INSERT INTO public.analytics_sessions (session_id, user_id, referrer, source, device, browser, country, has_adblocker, created_at)
        VALUES (${session_id}, NULL, NULL, 'Direct', ${device}, ${browser}, ${country}, false, NOW())
        ON CONFLICT (session_id) DO NOTHING
      `;
    }
  } catch (err) {
    console.error("[StoonAnalytics] Error in ensureSessionExists:", err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Soportar tanto peticiones individuales (compatibilidad) como lotes acumulados (batching)
    const events = Array.isArray(body) ? body : [body];
    const country = 
      request.headers.get("x-vercel-ip-country") || 
      request.headers.get("cf-ipcountry") || 
      request.headers.get("x-real-ip-country") ||
      "Desconocido";

    for (const event of events) {
      const { type, session_id } = event;
      if (!session_id) continue;

      // Asegurar que la sesión exista en BD local antes de meter métricas secundarias
      if (type === "pageview" || type === "heartbeat" || type === "event" || type === "performance") {
        await ensureSessionExists(session_id, request);
      }

      // 1. INICIO DE SESIÓN
      if (type === "session_start") {
        const userAgent = request.headers.get("user-agent");
        const { device, browser } = parseUserAgent(userAgent);
        const referrer = event.referrer || null;
        const source = parseSource(referrer);
        const hasAdblocker = event.has_adblocker || false;
        
        // El user_id se guarda como null por defecto al iniciar de forma anonima
        const userId = event.user_id || null;

        await sql`
          INSERT INTO public.analytics_sessions (session_id, user_id, referrer, source, device, browser, country, has_adblocker, created_at)
          VALUES (${session_id}, ${userId}, ${referrer}, ${source}, ${device}, ${browser}, ${country}, ${hasAdblocker}, NOW())
          ON CONFLICT (session_id) DO UPDATE 
          SET user_id = EXCLUDED.user_id,
              referrer = COALESCE(analytics_sessions.referrer, EXCLUDED.referrer),
              source = COALESCE(analytics_sessions.source, EXCLUDED.source),
              has_adblocker = EXCLUDED.has_adblocker
        `;
      }

      // 2. VISTA DE PÁGINA
      else if (type === "pageview") {
        const { path, manga_id, chapter_id } = event;
        if (!path) continue;

        await sql`
          INSERT INTO public.analytics_pageviews (session_id, path, manga_id, chapter_id, duration, created_at)
          VALUES (${session_id}, ${path}, ${manga_id || null}, ${chapter_id || null}, 0, NOW())
        `;
      }

      // 3. HEARTBEAT (Tiempo de permanencia)
      else if (type === "heartbeat") {
        const { path, secondsToAdd } = event;
        if (!path) continue;

        // Sumar los segundos transcurridos (por defecto 30 si no viene especificado en llamadas antiguas)
        const increment = secondsToAdd || 30;

        // Buscar el último registro de página vista en este path para acumular la duración
        const [lastPageview] = await sql`
          SELECT id FROM public.analytics_pageviews
          WHERE session_id = ${session_id} AND path = ${path}
          ORDER BY created_at DESC
          LIMIT 1
        ` as any[];

        if (lastPageview) {
          await sql`
            UPDATE public.analytics_pageviews
            SET duration = duration + ${increment}
            WHERE id = ${lastPageview.id}
          `;
        }
      }

      // 4. EVENTO PERSONALIZADO
      else if (type === "event") {
        const { event_name, event_data } = event;
        if (!event_name) continue;

        await sql`
          INSERT INTO public.analytics_events (session_id, event_name, event_data, created_at)
          VALUES (${session_id}, ${event_name}, ${event_data ? JSON.stringify(event_data) : null}, NOW())
        `;
      }

      // 5. RENDIMIENTO DE CARGA DE IMAGENES (Muestreo del 5%)
      else if (type === "performance") {
        // Reducir la ingesta de telemetría de rendimiento al 5% en servidor (además del cliente)
        if (Math.random() > 0.05) {
          continue; 
        }

        const { manga_id, chapter_id, image_url, load_time_ms, success } = event;
        if (load_time_ms === undefined) continue;

        await sql`
          INSERT INTO public.analytics_performance (session_id, manga_id, chapter_id, image_url, load_time_ms, success, created_at)
          VALUES (${session_id}, ${manga_id || null}, ${chapter_id || null}, ${image_url || null}, ${load_time_ms}, ${success !== undefined ? success : true}, NOW())
        `;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[StoonAnalytics] Error en endpoint track:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

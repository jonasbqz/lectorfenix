import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isDmcaBlocked } from "./app/utils/dmca";
import { extractComicIdFromSlugId } from "./app/utils/slugify";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Intercept comics routes to block DMCA content with HTTP 451 status
  const comicsMatch = pathname.match(/^\/comics\/([^/]+)(?:\/chapters\/([^/]+))?$/);
  if (comicsMatch) {
    const slug = comicsMatch[1];
    const mangaId = extractComicIdFromSlugId(slug);
    if (isDmcaBlocked(mangaId)) {
      return new NextResponse(
        `<!DOCTYPE html>
        <html lang="es">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Contenido no disponible - MangaStoon</title>
            <meta name="robots" content="noindex, nofollow" />
            <style>
              body {
                background-color: #0a0908;
                color: #ffffff;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                padding: 20px;
                box-sizing: border-box;
              }
              .card {
                background-color: #161514;
                border: 1px solid rgba(239, 68, 68, 0.2);
                border-radius: 12px;
                padding: 30px;
                max-width: 500px;
                width: 100%;
                text-align: center;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
              }
              .icon {
                font-size: 48px;
                margin-bottom: 20px;
              }
              h1 {
                font-size: 22px;
                margin: 0 0 15px 0;
                color: #ef4444;
                font-weight: 600;
              }
              p {
                font-size: 14px;
                line-height: 1.6;
                color: #a1a09e;
                margin: 0 0 20px 0;
              }
              .btn {
                display: inline-block;
                background-color: #ef4444;
                color: white;
                text-decoration: none;
                padding: 10px 20px;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                transition: background-color 0.2s;
              }
              .btn:hover {
                background-color: #dc2626;
              }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="icon">⚠️</div>
              <h1>Contenido no disponible</h1>
              <p>Este manga ha sido retirado debido a una reclamación por infracción de derechos de autor (DMCA) enviada por el titular de la obra original.</p>
              <a href="/" class="btn">Volver al Inicio</a>
            </div>
          </body>
        </html>`,
        {
          status: 451, // HTTP 451 Unavailable For Legal Reasons
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "X-Robots-Tag": "noindex, nofollow",
          },
        }
      );
    }
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Si no están configuradas las variables reales, evitamos inicializar Supabase para no tirar un 500
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes("placeholder")) {
    return supabaseResponse;
  }

  const shouldSkipSessionRefresh = pathname.startsWith("/api/") || pathname.startsWith("/sitemap");

  if (!shouldSkipSessionRefresh) {
    try {
      const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) =>
                request.cookies.set(name, value)
              );
              supabaseResponse = NextResponse.next({ request });
              cookiesToSet.forEach(({ name, value, options }) =>
                supabaseResponse.cookies.set(name, value, options)
              );
            },
          },
        }
      );

      // Refresca la sesión — IMPORTANTE: no elimines este await
      await supabase.auth.getUser();
    } catch (error) {
      console.error("[Middleware] Error refreshing supabase session:", error);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};


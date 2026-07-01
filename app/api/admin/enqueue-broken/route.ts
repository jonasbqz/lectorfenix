import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";
import { searchLeerCapituloByTitle } from "../../../utils/mangadex";
import { slugify } from "../../../utils/slugify";
import { isDmcaBlocked } from "../../../utils/dmca";
import { logger } from "../../../utils/logger";
import { sql } from "../../../../utils/postgres/client";

export const dynamic = "force-dynamic";

function isMangaDexUuidHelper(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const [profile] = await sql`
      SELECT is_admin FROM public.profiles WHERE id = ${user.id} LIMIT 1
    ` as any[];

    if (!profile || !profile.is_admin) {
      return NextResponse.json({ error: "Acceso denegado. Se requiere cuenta de administrador." }, { status: 403 });
    }

    let targetMangaId: string | null = null;
    try {
      const body = await request.json();
      targetMangaId = body?.mangaId || null;
    } catch {}

    // Fetch broken chapters (filter by mangaId if specified) from local Postgres
    let brokenChapters: any[] = [];
    if (targetMangaId) {
      brokenChapters = await sql`
        SELECT manga_id, manga_title FROM public.broken_chapters WHERE manga_id = ${targetMangaId}
      ` as any[];
    } else {
      brokenChapters = await sql`
        SELECT manga_id, manga_title FROM public.broken_chapters
      ` as any[];
    }

    if (!brokenChapters || brokenChapters.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: "No broken chapters found." });
    }

    // Group by unique manga_id
    const uniqueMangasMap = new Map<string, string>();
    for (const ch of brokenChapters) {
      if (ch.manga_id && ch.manga_title) {
        uniqueMangasMap.set(ch.manga_id, ch.manga_title);
      }
    }

    logger.info(`[enqueue-broken] Found ${uniqueMangasMap.size} unique broken mangas to process.`);

    let enqueuedCount = 0;
    let skippedCount = 0;

    for (const [mangaId, mangaTitle] of uniqueMangasMap.entries()) {
      try {
        const cleanSlug = mangaId.startsWith("lc-") ? mangaId.substring(3) : mangaId;
        let leercapituloSlug: string | null = null;

        // Try resolving via searchLeerCapituloByTitle first
        try {
          leercapituloSlug = await searchLeerCapituloByTitle(mangaTitle);
        } catch (err) {
          logger.error(`[enqueue-broken] Error searching LeerCapitulo for ${mangaTitle}:`, err);
        }

        if (!leercapituloSlug) {
          // Fallback: build a guess slug
          if (isMangaDexUuidHelper(cleanSlug)) {
            leercapituloSlug = slugify(mangaTitle);
          } else {
            const uuidMatch = cleanSlug.match(/^(.*?)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
            leercapituloSlug = uuidMatch && uuidMatch[1] ? uuidMatch[1] : cleanSlug;
          }
        }

        if (leercapituloSlug) {
          const sourceUrl = `https://www.leercapitulo.co/manga/${leercapituloSlug}/`;

          // Check DMCA blocklist
          const blockedKeywords = ["ruridragon", "ruriragon", "ultimo-saiyuki", "ultimo saiyuki", "saiyuki", "pokemon-adventures", "pokemon adventures", "steel-ball-run", "steel ball run", "jojo"];
          const isBlocked = blockedKeywords.some(kw => mangaTitle.toLowerCase().includes(kw) || leercapituloSlug!.toLowerCase().includes(kw));

          if (!isBlocked && !isDmcaBlocked(mangaId)) {
            // Check if already in queue from local Postgres
            const [existingJob] = await sql`
              SELECT id, status FROM public.scraper_queue WHERE source_url = ${sourceUrl} LIMIT 1
            ` as any[];

            if (!existingJob) {
              await sql`
                INSERT INTO public.scraper_queue (manga_title, source_url, status, priority, requested_by, requested_at, updated_at)
                VALUES (${mangaTitle}, ${sourceUrl}, 'pending', 2, ${user.id}, NOW(), NOW())
              `;
              enqueuedCount++;
            } else if (existingJob.status === "failed") {
              await sql`
                UPDATE public.scraper_queue
                SET status = 'pending', priority = 2, error_message = NULL, updated_at = NOW()
                WHERE id = ${existingJob.id}
              `;
              enqueuedCount++;
            } else {
              skippedCount++; // Already pending or completed
            }
          } else {
            skippedCount++;
          }
        }
      } catch (err) {
        logger.error(`[enqueue-broken] Error processing manga ${mangaTitle}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      processed: uniqueMangasMap.size,
      enqueued: enqueuedCount,
      skipped: skippedCount,
      message: `Procesados ${uniqueMangasMap.size} mangas. Encolados/Reiniciados: ${enqueuedCount}. Omitidos: ${skippedCount}.`
    });

  } catch (err: any) {
    logger.error("[enqueue-broken] Error in API handler:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}


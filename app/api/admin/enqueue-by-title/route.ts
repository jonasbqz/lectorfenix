import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";
import { searchLeerCapituloByTitle } from "../../../utils/mangadex";
import { slugify } from "../../../utils/slugify";
import { logger } from "../../../utils/logger";
import { sql } from "../../../../utils/postgres/client";

export const dynamic = "force-dynamic";

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

    const body = await request.json();
    const mangaTitle = body?.title?.trim();
    const priority = body?.priority !== undefined ? Number(body.priority) : 5;

    if (!mangaTitle) {
      return NextResponse.json({ error: "Falta el título del manga" }, { status: 400 });
    }

    // Check DMCA keywords
    const blockedKeywords = ["ruridragon", "ruriragon", "ultimo-saiyuki", "ultimo saiyuki", "saiyuki", "pokemon-adventures", "pokemon adventures", "steel-ball-run", "steel ball run", "jojo"];
    const isBlocked = blockedKeywords.some(kw => mangaTitle.toLowerCase().includes(kw));

    if (isBlocked) {
      return NextResponse.json({ error: "Este manga está bloqueado por reclamos de copyright (DMCA)." }, { status: 400 });
    }

    let leercapituloSlug: string | null = null;
    try {
      leercapituloSlug = await searchLeerCapituloByTitle(mangaTitle);
    } catch (err) {
      logger.error(`[enqueue-by-title] Error searching LeerCapitulo for ${mangaTitle}:`, err);
    }

    if (!leercapituloSlug) {
      // Fallback: guess slug
      leercapituloSlug = slugify(mangaTitle);
    }

    const sourceUrl = `https://www.leercapitulo.co/manga/${leercapituloSlug}/`;

    // Check if already in queue
    const [existingJob] = await sql`
      SELECT id, status FROM public.scraper_queue WHERE source_url = ${sourceUrl} LIMIT 1
    ` as any[];

    if (existingJob) {
      if (existingJob.status === "failed") {
        // Reset failed job
        await sql`
          UPDATE public.scraper_queue
          SET status = 'pending', priority = ${priority}, error_message = NULL, updated_at = NOW()
          WHERE id = ${existingJob.id}
        `;

        return NextResponse.json({
          success: true,
          message: `El manga ya estaba en la cola con estado fallido. Se ha reiniciado con éxito. URL: ${sourceUrl}`
        });
      }

      return NextResponse.json({
        success: true,
        message: `El manga ya se encuentra en la cola con estado "${existingJob.status}". URL: ${sourceUrl}`
      });
    }

    // Insert new job
    await sql`
      INSERT INTO public.scraper_queue (manga_title, source_url, status, priority, requested_by, requested_at, updated_at)
      VALUES (${mangaTitle}, ${sourceUrl}, 'pending', ${priority}, ${user.id}, NOW(), NOW())
    `;

    return NextResponse.json({
      success: true,
      message: `Manga agregado a la cola con éxito. URL resuelta: ${sourceUrl}`
    });

  } catch (err: any) {
    logger.error("[enqueue-by-title] Error in API handler:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}


import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";
import { sql } from "../../../../utils/postgres/client";

export const dynamic = "force-dynamic";

async function ensureLocalProfileExists(user: any) {
  try {
    const [existing] = await sql`
      SELECT id FROM public.profiles WHERE id = ${user.id} LIMIT 1
    ` as any[];

    if (!existing) {
      const emailUsername = user.email ? user.email.split("@")[0] : "usuario";
      const username = user.user_metadata?.username || user.user_metadata?.full_name || emailUsername || "Usuario";
      const avatarUrl = user.user_metadata?.avatar_url || null;

      await sql`
        INSERT INTO public.profiles (id, username, avatar_url, updated_at)
        VALUES (${user.id}, ${username}, ${avatarUrl}, NOW())
        ON CONFLICT (id) DO NOTHING
      `;
    }
  } catch (err) {
    console.error("[ensureLocalProfileExists] Error:", err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { commentId, type } = body; // type is "words" | "spoiler"

    if (!commentId || !type || (type !== "words" && type !== "spoiler")) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const userId = user.id;

    // Asegurar que el perfil exista localmente
    await ensureLocalProfileExists(user);

    // 1. Verificar si ya existe este reporte en Postgres local
    const [existingReport] = await sql`
      SELECT id FROM public.comment_reports
      WHERE comment_id = ${commentId} AND user_id = ${userId} AND report_type = ${type}
      LIMIT 1
    ` as any[];

    if (!existingReport) {
      await sql`
        INSERT INTO public.comment_reports (comment_id, user_id, report_type, created_at)
        VALUES (${commentId}, ${userId}, ${type}, NOW())
      `;
    }

    // 2. Obtener la cantidad acumulada de reportes para este comentario
    const reports = await sql`
      SELECT report_type FROM public.comment_reports
      WHERE comment_id = ${commentId}
    ` as any[];

    const reportedWordsCount = reports.filter((r: any) => r.report_type === "words").length;
    const reportedSpoilerCount = reports.filter((r: any) => r.report_type === "spoiler").length;

    const isSpoiler = reportedSpoilerCount >= 3;
    if (isSpoiler) {
      await sql`
        UPDATE public.comments
        SET is_spoiler = true
        WHERE id = ${commentId}
      `;
    }

    const isModerated = reportedWordsCount >= 5;
    if (isModerated) {
      await sql`
        UPDATE public.comments
        SET is_moderated = true
        WHERE id = ${commentId}
      `;
    }

    return NextResponse.json({
      success: true,
      reportedWords: reportedWordsCount,
      reportedSpoiler: reportedSpoilerCount,
      isSpoiler,
      isModerated,
    });
  } catch (err: any) {
    console.error("[Comments Report API] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

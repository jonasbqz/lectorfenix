"use server";

import { createClient } from "../../utils/supabase/server";
import { sql } from "../../utils/postgres/client";

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

export async function getHistoryAction() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  console.log("[getHistoryAction] Auth check. User ID:", user?.id, "Auth error:", authError?.message || "none");

  if (authError || !user) {
    return { error: "unauthenticated" };
  }

  try {
    const data = await sql`
      SELECT manga_id, manga_title, chapter_id, chapter_number, cover_image, updated_at
      FROM public.reading_history
      WHERE user_id = ${user.id}
      ORDER BY updated_at DESC
    ` as any[];

    const history = data.map((item) => ({
      mangaId: item.manga_id,
      mangaTitle: item.manga_title,
      chapterId: item.chapter_id,
      chapterNumber: item.chapter_number,
      coverImage: item.cover_image || "",
      timestamp: new Date(item.updated_at).getTime(),
    }));

    return { history };
  } catch (error: any) {
    console.error("[getHistoryAction] DB error:", error);
    return { error: "db_error", message: error.message, history: [] };
  }
}

export async function addHistoryAction(item: {
  mangaId: string;
  mangaTitle: string;
  chapterId: string;
  chapterNumber: string;
  coverImage: string;
}) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  console.log("[addHistoryAction] Auth check. User ID:", user?.id, "Auth error:", authError?.message || "none", "mangaId:", item.mangaId);

  if (authError || !user) {
    console.warn("[addHistoryAction] Unauthenticated attempt to add history item:", item.mangaId);
    return { error: "unauthenticated" };
  }

  // Asegurar que el perfil exista en la base de datos local antes de insertar
  await ensureLocalProfileExists(user);

  try {
    await sql`
      INSERT INTO public.reading_history (user_id, manga_id, manga_title, chapter_id, chapter_number, cover_image, updated_at)
      VALUES (${user.id}, ${item.mangaId}, ${item.mangaTitle}, ${item.chapterId}, ${item.chapterNumber}, ${item.coverImage || null}, NOW())
      ON CONFLICT (user_id, manga_id) DO UPDATE 
      SET manga_title = EXCLUDED.manga_title,
          chapter_id = EXCLUDED.chapter_id,
          chapter_number = EXCLUDED.chapter_number,
          cover_image = COALESCE(EXCLUDED.cover_image, reading_history.cover_image),
          updated_at = NOW()
    `;

    console.log("[addHistoryAction] Successfully added history for user:", user.id, "manga:", item.mangaId);
    return { success: true };
  } catch (error: any) {
    console.error("[addHistoryAction] DB error:", error);
    return { error: "db_error", message: error.message };
  }
}

export async function removeHistoryAction(mangaId: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "unauthenticated" };
  }

  try {
    await sql`
      DELETE FROM public.reading_history
      WHERE user_id = ${user.id} AND manga_id = ${mangaId}
    `;

    return { success: true };
  } catch (error: any) {
    console.error("[removeHistoryAction] DB error:", error);
    return { error: "db_error", message: error.message };
  }
}

export async function clearHistoryAction() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "unauthenticated" };
  }

  try {
    await sql`
      DELETE FROM public.reading_history
      WHERE user_id = ${user.id}
    `;

    return { success: true };
  } catch (error: any) {
    console.error("[clearHistoryAction] DB error:", error);
    return { error: "db_error", message: error.message };
  }
}

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

export async function toggleMangaLikeAction(mangaId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "unauthenticated" };
  }

  try {
    // Verificar si el like existe
    const [existingLike] = await sql`
      SELECT user_id FROM public.likes
      WHERE user_id = ${user.id} AND manga_id = ${mangaId}
      LIMIT 1
    ` as any[];

    if (existingLike) {
      // Eliminar el like
      await sql`
        DELETE FROM public.likes
        WHERE user_id = ${user.id} AND manga_id = ${mangaId}
      `;
      return { liked: false };
    } else {
      // Asegurar que el perfil local exista antes de insertar
      await ensureLocalProfileExists(user);

      // Insertar el like
      await sql`
        INSERT INTO public.likes (user_id, manga_id, created_at)
        VALUES (${user.id}, ${mangaId}, NOW())
      `;
      return { liked: true };
    }
  } catch (error: any) {
    console.error("[toggleMangaLikeAction] DB error:", error);
    return { error: "db_error", message: error.message };
  }
}

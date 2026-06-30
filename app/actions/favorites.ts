"use server";

import { createClient } from "../../utils/supabase/server";
import { sql } from "../../utils/postgres/client";
import { revalidatePath } from "next/cache";

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

export async function getFavoritesAction() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "unauthenticated" };
  }

  try {
    const data = await sql`
      SELECT manga_id, manga_data, created_at
      FROM public.favorites
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
    ` as any[];

    // Retornamos mapeando para asegurar la consistencia del objeto
    const favorites = data.map((item) => {
      const rawData = typeof item.manga_data === "string" ? JSON.parse(item.manga_data) : item.manga_data;
      return {
        ...rawData,
        id: item.manga_id,
        mangaDexId: item.manga_id
      };
    });

    return { favorites };
  } catch (error: any) {
    console.error("[getFavoritesAction] DB error:", error);
    return { error: "db_error", message: error.message, favorites: [] };
  }
}

export async function addFavoriteAction(mangaId: string, mangaData: any) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "unauthenticated" };
  }

  // Asegurar que el perfil exista en la base de datos local antes de insertar
  await ensureLocalProfileExists(user);

  // Quitamos campos id del json para que no haga colisión
  const cleanMangaData = { ...mangaData };
  delete cleanMangaData.id;

  try {
    await sql`
      INSERT INTO public.favorites (user_id, manga_id, manga_data, created_at)
      VALUES (${user.id}, ${mangaId}, ${JSON.stringify(cleanMangaData)}, NOW())
      ON CONFLICT (user_id, manga_id) DO UPDATE 
      SET manga_data = EXCLUDED.manga_data,
          created_at = NOW()
    `;

    revalidatePath("/favoritos");
    return { success: true };
  } catch (error: any) {
    console.error("[addFavoriteAction] DB error:", error);
    return { error: "db_error", message: error.message };
  }
}

export async function removeFavoriteAction(mangaId: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "unauthenticated" };
  }

  try {
    await sql`
      DELETE FROM public.favorites
      WHERE user_id = ${user.id} AND manga_id = ${mangaId}
    `;

    revalidatePath("/favoritos");
    return { success: true };
  } catch (error: any) {
    console.error("[removeFavoriteAction] DB error:", error);
    return { error: "db_error", message: error.message };
  }
}

"use server";

import { createClient } from "../../utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function getFavoritesAction() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "unauthenticated" };
  }

  const { data, error } = await supabase
    .from("favorites")
    .select("manga_id, manga_data, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getFavoritesAction] DB error:", error.code, error.message);
    // Si la tabla no existe aún porque el usuario no corrió la migración, evitamos que rompa la app
    if (error.code === "P0001" || error.message?.includes("relation") || error.message?.includes("does not exist")) {
      return { error: "table_not_exists", favorites: [] };
    }
    return { error: "db_error", message: error.message, favorites: [] };
  }

  // Retornamos mapeando para asegurar la consistencia del objeto
  const favorites = (data || []).map((item) => {
    const rawData = typeof item.manga_data === "string" ? JSON.parse(item.manga_data) : item.manga_data;
    return {
      ...rawData,
      id: item.manga_id,
      mangaDexId: item.manga_id
    };
  });

  return { favorites };
}

export async function addFavoriteAction(mangaId: string, mangaData: any) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "unauthenticated" };
  }

  // Quitamos campos id del json para que no haga colisión
  const cleanMangaData = { ...mangaData };
  delete cleanMangaData.id;

  const { error } = await supabase
    .from("favorites")
    .upsert({
      user_id: user.id,
      manga_id: mangaId,
      manga_data: cleanMangaData,
      created_at: new Date().toISOString(),
    }, {
      onConflict: "user_id,manga_id"
    });

  if (error) {
    console.error("[addFavoriteAction] DB error:", error.code, error.message);
    return { error: "db_error", message: error.message };
  }

  revalidatePath("/favoritos");
  return { success: true };
}

export async function removeFavoriteAction(mangaId: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "unauthenticated" };
  }

  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("user_id", user.id)
    .eq("manga_id", mangaId);

  if (error) {
    console.error("[removeFavoriteAction] DB error:", error.code, error.message);
    return { error: "db_error", message: error.message };
  }

  revalidatePath("/favoritos");
  return { success: true };
}

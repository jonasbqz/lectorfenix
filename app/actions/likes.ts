"use server";

import { createClient } from "../../utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function toggleMangaLikeAction(mangaId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "unauthenticated" };
  }

  // Check if like exists
  const { data: existingLike } = await supabase
    .from("likes")
    .select("*")
    .eq("user_id", user.id)
    .eq("manga_id", mangaId)
    .maybeSingle();

  if (existingLike) {
    // Delete the like
    const { error: deleteError } = await supabase
      .from("likes")
      .delete()
      .eq("user_id", user.id)
      .eq("manga_id", mangaId);

    if (deleteError) {
      return { error: "db_error", message: deleteError.message };
    }

    return { liked: false };
  } else {
    // Insert the like
    const { error: insertError } = await supabase
      .from("likes")
      .insert({
        user_id: user.id,
        manga_id: mangaId,
      });

    if (insertError) {
      return { error: "db_error", message: insertError.message };
    }

    return { liked: true };
  }
}

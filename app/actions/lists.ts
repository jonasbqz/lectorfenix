"use server";

import { createClient } from "../../utils/supabase/server";
import { revalidatePath } from "next/cache";
import { getOrSetCached, stableCacheKey } from "../utils/server-cache";

export interface MangaList {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  profiles?: {
    username: string | null;
    avatar_url: string | null;
    is_premium?: boolean;
  } | null;
  items_count?: number;
}

export interface MangaListItem {
  id: string;
  list_id: string;
  manga_id: string;
  manga_title: string;
  cover_image: string | null;
  created_at: string;
}

// 1. Obtener listas del usuario logueado
export async function getUserMangaLists() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "unauthenticated", lists: [] };
  }

  const { data, error } = await supabase
    .from("manga_lists")
    .select(`
      *,
      items_count:manga_list_items(count)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getUserMangaLists] DB error:", error.code, error.message);
    if (error.code === "P0001" || error.message?.includes("relation") || error.message?.includes("does not exist")) {
      return { error: "table_not_exists", lists: [] };
    }
    return { error: "db_error", message: error.message, lists: [] };
  }

  const lists = (data || []).map(item => ({
    ...item,
    items_count: item.items_count && item.items_count[0] ? (item.items_count[0] as any).count : 0
  })) as MangaList[];

  return { lists };
}

// 2. Crear una lista nueva
export async function createMangaListAction(name: string, description: string, isPublic: boolean) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "unauthenticated" };
  }

  if (!name.trim()) {
    return { error: "name_required" };
  }

  const { data, error } = await supabase
    .from("manga_lists")
    .insert({
      user_id: user.id,
      name: name.trim(),
      description: description.trim() || null,
      is_public: isPublic,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("[createMangaList] DB error:", error.code, error.message);
    return { error: "db_error", message: error.message };
  }

  revalidatePath("/profile");
  revalidatePath("/lists");
  return { success: true, list: data };
}

// 3. Eliminar una lista
export async function deleteMangaListAction(listId: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "unauthenticated" };
  }

  const { error } = await supabase
    .from("manga_lists")
    .delete()
    .eq("id", listId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[deleteMangaList] DB error:", error.code, error.message);
    return { error: "db_error", message: error.message };
  }

  revalidatePath("/profile");
  revalidatePath("/lists");
  return { success: true };
}

// 4. Agregar manga a una lista
export async function addMangaToListAction(listId: string, mangaId: string, mangaTitle: string, coverImage: string | null) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "unauthenticated" };
  }

  // Verificar primero que la lista pertenezca al usuario
  const { data: list, error: listError } = await supabase
    .from("manga_lists")
    .select("id")
    .eq("id", listId)
    .eq("user_id", user.id)
    .single();

  if (listError || !list) {
    return { error: "list_not_found_or_access_denied" };
  }

  const { error } = await supabase
    .from("manga_list_items")
    .upsert({
      list_id: listId,
      manga_id: mangaId,
      manga_title: mangaTitle,
      cover_image: coverImage,
      created_at: new Date().toISOString(),
    }, {
      onConflict: "list_id,manga_id"
    });

  if (error) {
    console.error("[addMangaToList] DB error:", error.code, error.message);
    return { error: "db_error", message: error.message };
  }

  revalidatePath(`/lists/${listId}`);
  revalidatePath("/profile");
  return { success: true };
}

// 5. Eliminar manga de una lista
export async function removeMangaFromListAction(listId: string, mangaId: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "unauthenticated" };
  }

  // Verificar que la lista pertenezca al usuario
  const { data: list, error: listError } = await supabase
    .from("manga_lists")
    .select("id")
    .eq("id", listId)
    .eq("user_id", user.id)
    .single();

  if (listError || !list) {
    return { error: "list_not_found_or_access_denied" };
  }

  const { error } = await supabase
    .from("manga_list_items")
    .delete()
    .eq("list_id", listId)
    .eq("manga_id", mangaId);

  if (error) {
    console.error("[removeMangaFromList] DB error:", error.code, error.message);
    return { error: "db_error", message: error.message };
  }

  revalidatePath(`/lists/${listId}`);
  revalidatePath("/profile");
  return { success: true };
}

// 6. Obtener listas públicas para la comunidad (sección listas públicas)
export async function getPublicMangaLists() {
  return getOrSetCached(
    stableCacheKey("public-manga-lists-v2", []),
    120, // 2 minutes cache
    async () => {
      const supabase = await createClient();

      const { data: lists, error } = await supabase
        .from("manga_lists")
        .select(`
          *,
          items:manga_list_items(manga_id, cover_image)
        `)
        .eq("is_public", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[getPublicMangaLists] DB error:", error.code, error.message);
        if (error.code === "P0001" || error.message?.includes("relation") || error.message?.includes("does not exist")) {
          return { error: "table_not_exists", lists: [] };
        }
        return { error: "db_error", message: error.message, lists: [] };
      }

      if (!lists || lists.length === 0) {
        return { lists: [] };
      }

      // Cargar perfiles por separado
      const userIds = Array.from(new Set(lists.map(l => l.user_id)));
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, is_premium")
        .in("id", userIds);

      if (profilesError) {
        console.error("[getPublicMangaLists] Profiles error:", profilesError.message);
      }

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      const enrichedLists = lists.map(list => ({
        ...list,
        profiles: profileMap.get(list.user_id) || null
      }));

      return { lists: enrichedLists };
    }
  );
}

// 7. Obtener detalles de una lista y sus ítems (página pública o de edición)
export async function getMangaListDetails(listId: string) {
  const supabase = await createClient();

  // 1. Obtener la lista
  const { data: list, error: listError } = await supabase
    .from("manga_lists")
    .select("*")
    .eq("id", listId)
    .single();

  if (listError || !list) {
    console.error("[getMangaListDetails] List error:", listError?.message);
    return { error: "list_not_found" };
  }

  // 2. Si es privada, verificar que el usuario actual sea el creador
  if (!list.is_public) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== list.user_id) {
      return { error: "access_denied" };
    }
  }

  // Obtener perfil del creador por separado
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("username, avatar_url, is_premium")
    .eq("id", list.user_id)
    .maybeSingle();

  if (profileError) {
    console.error("[getMangaListDetails] Profile error:", profileError.message);
  }

  // 3. Obtener los ítems
  const { data: items, error: itemsError } = await supabase
    .from("manga_list_items")
    .select("*")
    .eq("list_id", listId)
    .order("created_at", { ascending: false });

  if (itemsError) {
    console.error("[getMangaListDetails] Items error:", itemsError.message);
    return { error: "items_error", message: itemsError.message };
  }

  const enrichedList = {
    ...list,
    profiles: profile || null
  } as MangaList;

  return {
    list: enrichedList,
    items: (items || []) as MangaListItem[]
  };
}

// 8. Verificar cuáles listas contienen un manga específico (para la página de detalle)
export async function getMangaListsWithStatus(mangaId: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "unauthenticated", lists: [] };
  }

  // Obtener todas las listas del usuario
  const { data: lists, error: listsError } = await supabase
    .from("manga_lists")
    .select("id, name, is_public")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (listsError) {
    return { error: "db_error", lists: [] };
  }

  if (!lists || lists.length === 0) {
    return { lists: [] };
  }

  const listIds = lists.map(l => l.id);

  // Obtener los ítems de esas listas para este manga
  const { data: items, error: itemsError } = await supabase
    .from("manga_list_items")
    .select("list_id")
    .in("list_id", listIds)
    .eq("manga_id", mangaId);

  if (itemsError) {
    return { error: "db_error", lists: [] };
  }

  const activeListIds = new Set((items || []).map(item => item.list_id));

  const listsWithStatus = lists.map(list => ({
    id: list.id,
    name: list.name,
    is_public: list.is_public,
    has_manga: activeListIds.has(list.id)
  }));

  return { lists: listsWithStatus };
}

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
    const { commentId, userId } = body;

    if (!commentId || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || user.id !== userId) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    // Asegurar que el perfil exista localmente
    await ensureLocalProfileExists(user);

    // 1. Verificar si ya le dio like al comentario en Postgres local
    const [existingLike] = await sql`
      SELECT user_id FROM public.comment_likes
      WHERE comment_id = ${commentId} AND user_id = ${userId}
      LIMIT 1
    ` as any[];

    let hasLiked = false;

    if (existingLike) {
      // Eliminar el like
      await sql`
        DELETE FROM public.comment_likes
        WHERE comment_id = ${commentId} AND user_id = ${userId}
      `;
      hasLiked = false;
    } else {
      // Agregar el like
      await sql`
        INSERT INTO public.comment_likes (comment_id, user_id, created_at)
        VALUES (${commentId}, ${userId}, NOW())
      `;
      hasLiked = true;

      // Disparar la notificación de like en segundo plano
      (async () => {
        try {
          // Buscar el creador del comentario original
          const [dbComment] = await sql`
            SELECT user_id, content, manga_id, chapter_id FROM public.comments
            WHERE id = ${commentId}
            LIMIT 1
          ` as any[];

          if (dbComment && dbComment.user_id !== userId) {
            const [profile] = await sql`
              SELECT username, avatar_url FROM public.profiles WHERE id = ${userId} LIMIT 1
            ` as any[];

            const { triggerNotification } = await import("../../notifications/helper");
            await triggerNotification({
              userId: dbComment.user_id,
              type: "like",
              senderId: userId,
              senderName: profile?.username || "Lector",
              senderAvatar: profile?.avatar_url || null,
              commentId,
              commentContent: dbComment.content,
              mangaId: dbComment.manga_id,
              chapterId: dbComment.chapter_id,
            });
          }
        } catch (notifErr) {
          console.error("[Like API Notification] Error:", notifErr);
        }
      })();
    }

    // Obtener la lista actualizada de likes de este comentario en la base de datos local
    const allLikes = await sql`
      SELECT user_id FROM public.comment_likes
      WHERE comment_id = ${commentId}
    ` as any[];

    const likesList = allLikes.map((l: any) => l.user_id);

    return NextResponse.json({
      success: true,
      likes: likesList,
      likesCount: likesList.length,
      hasLiked,
    });

  } catch (err: any) {
    console.error("[Comments Like API] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

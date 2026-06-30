import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";
import { sql } from "../../../utils/postgres/client";

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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const chapterId = searchParams.get("chapterId");
    const mangaId = searchParams.get("mangaId");

    if (!chapterId && !mangaId) {
      return NextResponse.json({ error: "Missing chapterId or mangaId" }, { status: 400 });
    }

    let data: any[] = [];

    // Consulta SQL unificada con Left Join y agregaciones en la base de datos local
    if (chapterId) {
      data = await sql`
        SELECT 
          c.id, c.chapter_id, c.manga_id, c.user_id, c.content, c.is_spoiler, c.is_moderated, c.created_at, c.parent_id,
          p.username as user_name, p.avatar_url as user_avatar, p.is_premium as user_is_premium,
          COALESCE(
            (SELECT json_agg(cl.user_id) FROM public.comment_likes cl WHERE cl.comment_id = c.id),
            '[]'::json
          ) as likes,
          COALESCE(
            (SELECT count(*)::int FROM public.comment_reports cr WHERE cr.comment_id = c.id AND cr.report_type = 'words'),
            0
          ) as reported_words,
          COALESCE(
            (SELECT count(*)::int FROM public.comment_reports cr WHERE cr.comment_id = c.id AND cr.report_type = 'spoiler'),
            0
          ) as reported_spoilers
        FROM public.comments c
        LEFT JOIN public.profiles p ON p.id = c.user_id
        WHERE c.chapter_id = ${chapterId}
        ORDER BY c.created_at DESC
      ` as any[];
    } else {
      data = await sql`
        SELECT 
          c.id, c.chapter_id, c.manga_id, c.user_id, c.content, c.is_spoiler, c.is_moderated, c.created_at, c.parent_id,
          p.username as user_name, p.avatar_url as user_avatar, p.is_premium as user_is_premium,
          COALESCE(
            (SELECT json_agg(cl.user_id) FROM public.comment_likes cl WHERE cl.comment_id = c.id),
            '[]'::json
          ) as likes,
          COALESCE(
            (SELECT count(*)::int FROM public.comment_reports cr WHERE cr.comment_id = c.id AND cr.report_type = 'words'),
            0
          ) as reported_words,
          COALESCE(
            (SELECT count(*)::int FROM public.comment_reports cr WHERE cr.comment_id = c.id AND cr.report_type = 'spoiler'),
            0
          ) as reported_spoilers
        FROM public.comments c
        LEFT JOIN public.profiles p ON p.id = c.user_id
        WHERE c.manga_id = ${mangaId} AND c.chapter_id = 'general'
        ORDER BY c.created_at DESC
      ` as any[];
    }

    const mappedComments = data.map((c: any) => {
      const likes = typeof c.likes === "string" ? JSON.parse(c.likes) : (c.likes || []);
      const isSpoiler = c.is_spoiler || c.reported_spoilers >= 3;
      const isModerated = c.is_moderated || c.reported_words >= 5;

      return {
        id: c.id,
        chapterId: c.chapter_id,
        mangaId: c.manga_id,
        userId: c.user_id,
        userName: c.user_name || "Usuario",
        userAvatar: c.user_avatar || null,
        userIsPremium: !!c.user_is_premium,
        content: c.content,
        isSpoiler,
        isModerated,
        likes,
        reportedWords: c.reported_words,
        reportedSpoiler: c.reported_spoilers,
        createdAt: c.created_at,
        parentId: c.parent_id || null,
      };
    });

    return NextResponse.json(mappedComments);
  } catch (err: any) {
    console.error("[Comments GET] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chapterId, mangaId, userId, userName, userAvatar, content, isSpoiler, userIsPremium, parentId } = body;

    if (!mangaId || !userId || !userName || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || user.id !== userId) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    // Asegurar que el perfil exista en la base de datos local
    await ensureLocalProfileExists(user);

    const resolvedChapterId = chapterId || "general";

    // Insertar el comentario en Postgres local
    const [newComment] = await sql`
      INSERT INTO public.comments (chapter_id, manga_id, user_id, content, is_spoiler, parent_id, created_at)
      VALUES (${resolvedChapterId}, ${mangaId}, ${userId}, ${content.trim()}, ${!!isSpoiler}, ${parentId || null}, NOW())
      RETURNING id, chapter_id, manga_id, user_id, content, is_spoiler, is_moderated, created_at, parent_id
    ` as any[];

    if (!newComment) {
      throw new Error("Failed to save comment in database");
    }

    // Obtener detalles del perfil local actualizado
    const [profile] = await sql`
      SELECT username, avatar_url, is_premium FROM public.profiles WHERE id = ${userId} LIMIT 1
    ` as any[];

    // Disparar notificación de respuesta en segundo plano si corresponde
    if (parentId && resolvedChapterId && newComment) {
      (async () => {
        try {
          // Buscar el creador del comentario padre en Postgres local
          const [parentComment] = await sql`
            SELECT user_id FROM public.comments WHERE id = ${parentId} LIMIT 1
          ` as any[];

          if (parentComment && parentComment.user_id !== userId) {
            const { triggerNotification } = await import("../notifications/helper");
            await triggerNotification({
              userId: parentComment.user_id,
              type: "reply",
              senderId: userId,
              senderName: profile?.username || userName,
              senderAvatar: profile?.avatar_url || userAvatar,
              commentId: newComment.id,
              commentContent: content,
              mangaId,
              chapterId: resolvedChapterId,
            });
          }
        } catch (notifErr) {
          console.error("[Comments POST Notification] Error:", notifErr);
        }
      })();
    }

    return NextResponse.json({
      id: newComment.id,
      chapterId: newComment.chapter_id,
      mangaId: newComment.manga_id,
      userId: newComment.user_id,
      userName: profile?.username || userName,
      userAvatar: profile?.avatar_url || userAvatar || null,
      userIsPremium: !!profile?.is_premium,
      content: newComment.content,
      isSpoiler: newComment.is_spoiler,
      isModerated: !!newComment.is_moderated,
      likes: [],
      reportedWords: 0,
      reportedSpoiler: 0,
      createdAt: newComment.created_at,
      parentId: newComment.parent_id || null,
    }, { status: 201 });
  } catch (err: any) {
    console.error("[Comments POST] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const commentId = searchParams.get("commentId");

    if (!commentId) {
      return NextResponse.json({ error: "Missing commentId" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    // Ejecutar el borrado en Postgres local
    await sql`
      DELETE FROM public.comments
      WHERE id = ${commentId} AND user_id = ${user.id}
    `;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[Comments DELETE] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

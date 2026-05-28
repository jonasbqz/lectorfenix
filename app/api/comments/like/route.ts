import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { createClient } from "../../../../utils/supabase/server";

export const dynamic = "force-dynamic";

const commentsFilePath = path.join(process.cwd(), ".next", "comments.json");

// ── Fallback File System logic ─────────────────────────────────────────────
async function readCommentsFile(): Promise<any[]> {
  try {
    await fs.mkdir(path.dirname(commentsFilePath), { recursive: true });
    try {
      const data = await fs.readFile(commentsFilePath, "utf-8");
      return JSON.parse(data);
    } catch (err: any) {
      if (err.code === "ENOENT") {
        await fs.writeFile(commentsFilePath, "[]", "utf-8");
        return [];
      }
      throw err;
    }
  } catch {
    return [];
  }
}

async function writeCommentsFile(comments: any[]): Promise<boolean> {
  try {
    await fs.mkdir(path.dirname(commentsFilePath), { recursive: true });
    await fs.writeFile(commentsFilePath, JSON.stringify(comments, null, 2), "utf-8");
    return true;
  } catch {
    return false;
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

    // Intentar toggle de likes en Supabase
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(commentId);
    
    let existingLike = null;
    let checkError: any = null;

    if (isUuid) {
      const { data, error } = await supabase
        .from("comment_likes")
        .select("*")
        .eq("comment_id", commentId)
        .eq("user_id", userId)
        .maybeSingle();
      existingLike = data;
      checkError = error;
    } else {
      checkError = { code: "22P02", message: "invalid input syntax for type uuid" };
    }

    // Fallback si la tabla no existe o si el ID es local (formato UUID invalido)
    if (checkError && (
      checkError.code === "P0001" ||
      checkError.code === "PGRST205" ||
      checkError.code === "42P01" ||
      checkError.code === "22P02" ||
      checkError.message?.includes("relation") ||
      checkError.message?.includes("does not exist") ||
      checkError.message?.includes("schema cache") ||
      checkError.message?.includes("invalid input syntax")
    )) {
      console.warn("[Comments Like API] La tabla 'comment_likes' no existe. Usando fallback de archivos locales.");
      const fileComments = await readCommentsFile();
      const index = fileComments.findIndex((c) => c.id === commentId);

      if (index === -1) {
        return NextResponse.json({ error: "Comment not found in fallback file" }, { status: 404 });
      }

      const comment = fileComments[index];
      if (!comment.likes) {
        comment.likes = [];
      }

      const hasLiked = comment.likes.includes(userId);
      if (hasLiked) {
        comment.likes = comment.likes.filter((id: string) => id !== userId);
      } else {
        comment.likes.push(userId);

        // Disparar notificación en segundo plano
        (async () => {
          try {
            let senderName = "Lector";
            let senderAvatar = null;
            const { data: dbProfile } = await supabase
              .from("profiles")
              .select("username, avatar_url")
              .eq("id", userId)
              .maybeSingle();
            if (dbProfile) {
              senderName = dbProfile.username || senderName;
              senderAvatar = dbProfile.avatar_url || senderAvatar;
            }

            const { triggerNotification } = await import("../../notifications/helper");
            await triggerNotification({
              userId: comment.userId,
              type: "like",
              senderId: userId,
              senderName,
              senderAvatar,
              commentId: comment.id,
              commentContent: comment.content,
              mangaId: comment.mangaId,
              chapterId: comment.chapterId,
            });
          } catch (notifErr) {
            console.error("[Like API Fallback Notification] Error:", notifErr);
          }
        })();
      }

      fileComments[index] = comment;
      const success = await writeCommentsFile(fileComments);
      if (!success) {
        return NextResponse.json({ error: "Failed to update fallback file" }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        likes: comment.likes,
        likesCount: comment.likes.length,
        hasLiked: !hasLiked,
      });
    }

    if (checkError) {
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    let hasLiked = false;
    if (existingLike) {
      const { error: deleteError } = await supabase
        .from("comment_likes")
        .delete()
        .eq("comment_id", commentId)
        .eq("user_id", userId);

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }
      hasLiked = false;
    } else {
      const { error: insertError } = await supabase
        .from("comment_likes")
        .insert({
          comment_id: commentId,
          user_id: userId,
        });

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
      hasLiked = true;

      // Disparar notificación en segundo plano para Supabase
      (async () => {
        try {
          const { data: dbComment } = await supabase
            .from("comments")
            .select("user_id, content, manga_id, chapter_id")
            .eq("id", commentId)
            .maybeSingle();

          if (dbComment) {
            let senderName = "Lector";
            let senderAvatar = null;
            const { data: dbProfile } = await supabase
              .from("profiles")
              .select("username, avatar_url")
              .eq("id", userId)
              .maybeSingle();
            if (dbProfile) {
              senderName = dbProfile.username || senderName;
              senderAvatar = dbProfile.avatar_url || senderAvatar;
            }

            const { triggerNotification } = await import("../../notifications/helper");
            await triggerNotification({
              userId: dbComment.user_id,
              type: "like",
              senderId: userId,
              senderName,
              senderAvatar,
              commentId,
              commentContent: dbComment.content,
              mangaId: dbComment.manga_id,
              chapterId: dbComment.chapter_id,
            });
          }
        } catch (notifErr) {
          console.error("[Like API Supabase Notification] Error:", notifErr);
        }
      })();
    }

    // Obtener la lista actualizada de likes de este comentario
    const { data: allLikes, error: fetchError } = await supabase
      .from("comment_likes")
      .select("user_id")
      .eq("comment_id", commentId);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const likesList = (allLikes || []).map((l: any) => l.user_id);

    return NextResponse.json({
      success: true,
      likes: likesList,
      likesCount: likesList.length,
      hasLiked,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

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

    // Verificar si ya existe este reporte
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(commentId);
    
    let existingReport = null;
    let checkError: any = null;

    if (isUuid) {
      const { data, error } = await supabase
        .from("comment_reports")
        .select("*")
        .eq("comment_id", commentId)
        .eq("user_id", userId)
        .eq("report_type", type)
        .maybeSingle();
      existingReport = data;
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
      console.warn("[Comments Report API] La tabla 'comment_reports' no existe. Usando fallback de archivos locales.");
      const fileComments = await readCommentsFile();
      const index = fileComments.findIndex((c) => c.id === commentId);

      if (index === -1) {
        return NextResponse.json({ error: "Comment not found in fallback file" }, { status: 404 });
      }

      const comment = fileComments[index];
      
      if (!comment.localReports) {
        comment.localReports = [];
      }

      const alreadyReported = comment.localReports.some(
        (r: any) => r.userId === userId && r.type === type
      );

      if (!alreadyReported) {
        comment.localReports.push({ userId, type });
        if (type === "words") {
          comment.reportedWords = (comment.reportedWords || 0) + 1;
          if (comment.reportedWords >= 5) {
            comment.isModerated = true;
          }
        } else if (type === "spoiler") {
          comment.reportedSpoiler = (comment.reportedSpoiler || 0) + 1;
          if (comment.reportedSpoiler >= 3) {
            comment.isSpoiler = true;
          }
        }
      }

      fileComments[index] = comment;
      const success = await writeCommentsFile(fileComments);
      if (!success) {
        return NextResponse.json({ error: "Failed to update fallback file" }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        reportedWords: comment.reportedWords,
        reportedSpoiler: comment.reportedSpoiler,
        isSpoiler: comment.isSpoiler,
        isModerated: !!comment.isModerated,
      });
    }

    if (checkError) {
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    if (!existingReport) {
      const { error: insertError } = await supabase
        .from("comment_reports")
        .insert({
          comment_id: commentId,
          user_id: userId,
          report_type: type,
        });

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    // Obtener la cantidad acumulada de reportes para este comentario
    const { data: reports, error: fetchError } = await supabase
      .from("comment_reports")
      .select("report_type")
      .eq("comment_id", commentId);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const reportedWordsCount = (reports || []).filter((r: any) => r.report_type === "words").length;
    const reportedSpoilerCount = (reports || []).filter((r: any) => r.report_type === "spoiler").length;

    // Si hay 3 o más reportes de spoiler, forzar el flag is_spoiler en el comentario
    let isSpoiler = reportedSpoilerCount >= 3;
    if (isSpoiler) {
      await supabase
        .from("comments")
        .update({ is_spoiler: true })
        .eq("id", commentId);
    }

    // Si hay 5 o más reportes de lenguaje, forzar is_moderated en el comentario
    let isModerated = reportedWordsCount >= 5;
    if (isModerated) {
      await supabase
        .from("comments")
        .update({ is_moderated: true })
        .eq("id", commentId);
    }

    return NextResponse.json({
      success: true,
      reportedWords: reportedWordsCount,
      reportedSpoiler: reportedSpoilerCount,
      isSpoiler,
      isModerated,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

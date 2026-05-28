import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { createClient } from "../../../utils/supabase/server";

export const dynamic = "force-dynamic";

const notificationsFilePath = path.join(process.cwd(), ".next", "notifications.json");

// ── Fallback File System logic ─────────────────────────────────────────────
async function readNotificationsFile(): Promise<any[]> {
  try {
    await fs.mkdir(path.dirname(notificationsFilePath), { recursive: true });
    try {
      const data = await fs.readFile(notificationsFilePath, "utf-8");
      return JSON.parse(data);
    } catch (err: any) {
      if (err.code === "ENOENT") {
        await fs.writeFile(notificationsFilePath, "[]", "utf-8");
        return [];
      }
      throw err;
    }
  } catch (err) {
    console.error("[Notifications File Fallback] Error reading file:", err);
    return [];
  }
}

async function writeNotificationsFile(notifications: any[]): Promise<boolean> {
  try {
    await fs.mkdir(path.dirname(notificationsFilePath), { recursive: true });
    await fs.writeFile(notificationsFilePath, JSON.stringify(notifications, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("[Notifications File Fallback] Error writing file:", err);
    return false;
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const notifications = await readNotificationsFile();
    // Filtrar las notificaciones destinadas al usuario logueado
    const userNotifications = notifications.filter((n) => n.userId === user.id);
    
    // Ordenar de más reciente a más vieja
    userNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(userNotifications);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const body = await req.json();
    const { notificationId } = body;

    const notifications = await readNotificationsFile();

    let updatedCount = 0;
    const updatedNotifications = notifications.map((n) => {
      // Si se especificó un ID, marcar solo esa; si no, marcar todas del usuario actual
      if (n.userId === user.id && (!notificationId || n.id === notificationId)) {
        if (!n.read) {
          n.read = true;
          updatedCount++;
        }
      }
      return n;
    });

    if (updatedCount > 0) {
      const success = await writeNotificationsFile(updatedNotifications);
      if (!success) {
        return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, markedReadCount: updatedCount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";
import { sql } from "../../../../utils/postgres/client";

export const dynamic = "force-dynamic";

// Helper para validar si el usuario autenticado es administrador
async function checkAdminAuth() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) return null;

    const [profile] = await sql`
      SELECT is_admin FROM public.profiles WHERE id = ${user.id} LIMIT 1
    ` as any[];

    if (!profile || !profile.is_admin) return null;

    return user;
  } catch (err) {
    console.error("[checkAdminAuth] Error:", err);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const user = await checkAdminAuth();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const data = await sql`
      SELECT id, manga_title, source_url, status, priority, requested_by, error_message, requested_at, updated_at
      FROM public.scraper_queue
      ORDER BY priority DESC, requested_at DESC
    ` as any[];

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[scraper-queue GET] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await checkAdminAuth();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { manga_title, source_url, priority } = body;

    if (!manga_title || !source_url) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    const [newJob] = await sql`
      INSERT INTO public.scraper_queue (manga_title, source_url, status, priority, requested_by, requested_at, updated_at)
      VALUES (${manga_title.trim()}, ${source_url.trim()}, 'pending', ${Number(priority) || 0}, ${user.id}, NOW(), NOW())
      RETURNING id, manga_title, source_url, status, priority, requested_at, updated_at
    ` as any[];

    return NextResponse.json(newJob, { status: 201 });
  } catch (err: any) {
    console.error("[scraper-queue POST] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await checkAdminAuth();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }

    await sql`
      DELETE FROM public.scraper_queue
      WHERE id = ${id}
    `;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[scraper-queue DELETE] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("search")?.trim();
  if (!search) return NextResponse.json({ error: "Falta búsqueda" }, { status: 400 });

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8085';
    const localRes = await fetch(`${apiUrl}/api/comics?search=${encodeURIComponent(search)}`, { cache: 'no-store' });
    const localData = await localRes.json();

    if (localData.data && localData.data.length > 0) {
      const m = localData.data[0];
      return NextResponse.json({
        title: m.title,
        synopsis: m.description || "Sin descripción",
        coverImage: m.coverImage,
        mangaDexId: m.slug,
        source: 'local'
      });
    }

    return NextResponse.json({ error: "No encontrado en BD local" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: "Error de servidor" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  // Monetag desactivado temporalmente. No cargar proveedores externos.
  return new NextResponse("// ads disabled temporarily", {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    },
  });
}

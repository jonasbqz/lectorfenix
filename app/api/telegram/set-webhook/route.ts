import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN is not configured" }, { status: 500 });
  }

  // Obtener URL de la petición para configurar el webhook automáticamente
  const host = req.headers.get("host") || "";
  const proto = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
  
  // URL final del webhook
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${proto}://${host}`;
  const webhookUrl = `${siteUrl}/api/telegram/webhook`;

  const salt = process.env.TELEGRAM_PREMIUM_SALT || "mangastoon_secreto_salt_2026";
  const secretToken = require("crypto").createHash("sha256").update(salt).digest("hex");

  const telegramUrl = `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}&secret_token=${secretToken}`;

  try {
    const res = await fetch(telegramUrl);
    const data = await res.json();
    
    if (!res.ok || !data.ok) {
      return NextResponse.json({ error: "Failed to set Telegram webhook", details: data }, { status: 502 });
    }

    return NextResponse.json({ success: true, webhookUrl, telegramResponse: data });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}

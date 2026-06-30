"use server";

import { createClient } from "../../utils/supabase/server";
import { sql } from "../../utils/postgres/client";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

// ─── Obtener perfil del usuario autenticado ────────────────────────────────
export async function getProfile() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    // Buscar en la base de datos local de Postgres
    let [profile] = await sql`
      SELECT id, username, avatar_url, username_updated_at, updated_at, reading_direction, is_premium, telegram_id, premium_until, telegram_last_checked, telegram_grace_started, premium_type
      FROM public.profiles
      WHERE id = ${user.id}
      LIMIT 1
    ` as any[];

    // Si no tiene fila en la tabla profiles, la creamos automáticamente
    if (!profile) {
      const emailUsername = user.email ? user.email.split("@")[0] : "usuario";
      const fallbackUsername = user.user_metadata?.username || user.user_metadata?.full_name || emailUsername || "Usuario";
      const fallbackAvatar = user.user_metadata?.picture || null;

      const [newProfile] = await sql`
        INSERT INTO public.profiles (id, username, avatar_url, updated_at)
        VALUES (${user.id}, ${fallbackUsername}, ${fallbackAvatar}, NOW())
        ON CONFLICT (id) DO UPDATE
        SET username = COALESCE(profiles.username, EXCLUDED.username),
            avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url)
        RETURNING id, username, avatar_url, username_updated_at, updated_at, reading_direction, is_premium, telegram_id, premium_until, telegram_last_checked, telegram_grace_started, premium_type
      ` as any[];

      if (newProfile) {
        profile = newProfile;
      }
    }

    // Validación perezosa (Lazy Validation) para usuarios premium de regalo
    if (profile && profile.is_premium && profile.premium_type === "gifted") {
      const now = new Date();

      // 1. Verificar si ya expiró el período de 30 días
      if (profile.premium_until && new Date(profile.premium_until) < now) {
        console.log(`[getProfile] El premium de regalo de ${profile.username} ha expirado.`);
        await sql`
          UPDATE public.profiles
          SET is_premium = false,
              premium_until = NULL,
              telegram_grace_started = NULL,
              updated_at = NOW()
          WHERE id = ${user.id}
        `;
        profile.is_premium = false;
        profile.premium_until = null;
        profile.telegram_grace_started = null;
      }
      // 2. Si sigue siendo premium, chequear membresía de Telegram si pasaron más de 24 horas
      else if (profile.telegram_id) {
        const lastChecked = profile.telegram_last_checked ? new Date(profile.telegram_last_checked) : null;
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        if (!lastChecked || lastChecked < oneDayAgo) {
          const token = process.env.TELEGRAM_BOT_TOKEN;
          const channelId = process.env.TELEGRAM_CHANNEL_ID || "-1003763338725";
          
          let isMember = false;
          if (token) {
            try {
              const res = await fetch(`https://api.telegram.org/bot${token}/getChatMember?chat_id=${channelId}&user_id=${profile.telegram_id}`);
              const data = await res.json();
              if (res.ok && data.ok) {
                const status = data.result?.status;
                isMember = ["member", "administrator", "creator", "restricted"].includes(status);
              }
            } catch (err) {
              console.warn("[getProfile] Error consultando membresía en Telegram, asumiendo miembro temporalmente:", err);
              isMember = true;
            }
          } else {
            isMember = true;
          }

          if (isMember) {
            // Sigue en el grupo, actualizar fecha de chequeo y limpiar gracia
            await sql`
              UPDATE public.profiles
              SET telegram_last_checked = NOW(),
                  telegram_grace_started = NULL,
                  updated_at = NOW()
              WHERE id = ${user.id}
            `;
            profile.telegram_last_checked = new Date().toISOString();
            profile.telegram_grace_started = null;
          } else {
            // Ya no está en el grupo
            if (!profile.telegram_grace_started) {
              // Iniciar período de gracia de 24 horas
              const graceStart = new Date().toISOString();
              await sql`
                UPDATE public.profiles
                SET telegram_last_checked = NOW(),
                    telegram_grace_started = ${graceStart},
                    updated_at = NOW()
                WHERE id = ${user.id}
              `;
              profile.telegram_last_checked = new Date().toISOString();
              profile.telegram_grace_started = graceStart;
            } else {
              // Ya estaba en gracia, ver si ya pasaron las 24 horas
              const graceStart = new Date(profile.telegram_grace_started);
              const graceExpiration = new Date(graceStart.getTime() + 24 * 60 * 60 * 1000);

              if (now > graceExpiration) {
                // Período de gracia expiró! Revocar premium.
                console.log(`[getProfile] Período de gracia de 24h expiró para ${profile.username}. Revocando premium.`);
                await sql`
                  UPDATE public.profiles
                  SET is_premium = false,
                      premium_until = NULL,
                      telegram_grace_started = NULL,
                      updated_at = NOW()
                  WHERE id = ${user.id}
                `;
                profile.is_premium = false;
                profile.premium_until = null;
                profile.telegram_grace_started = null;
              }
            }
          }
        }
      }
    }

    // Restaurar premium_since en metadatos de auth si es premium pero Discord/OAuth lo borró
    if (profile && profile.is_premium && !user.user_metadata?.premium_since) {
      const defaultPremiumSince = profile.created_at || user.created_at || new Date().toISOString();
      try {
        await supabase.auth.updateUser({
          data: {
            premium_since: defaultPremiumSince
          }
        });
        if (!user.user_metadata) user.user_metadata = {};
        user.user_metadata.premium_since = defaultPremiumSince;
      } catch (e) {
        console.warn("[getProfile] failed to restore premium_since metadata:", e);
      }
    }

    return { user, profile: profile ?? null };
  } catch (err) {
    console.error("[getProfile] Error loading profile:", err);
    return null;
  }
}

// ─── Actualizar nombre de usuario (con bloqueo de 7 días) ─────────────────
export async function updateUsername(newUsername: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "No autorizado." };
  }

  const trimmed = newUsername.trim();

  if (!trimmed || trimmed.length < 3) {
    return { error: "El nombre de usuario debe tener al menos 3 caracteres." };
  }
  if (trimmed.length > 30) {
    return { error: "El nombre de usuario no puede superar los 30 caracteres." };
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(trimmed)) {
    return { error: "Solo se permiten letras, números, puntos, guiones y guiones bajos." };
  }

  // Verificar bloqueo de 7 días y estado de administrador en Postgres local
  const [profile] = await sql`
    SELECT username, username_updated_at, is_admin FROM public.profiles WHERE id = ${user.id} LIMIT 1
  ` as any[];

  const lowerUsername = trimmed.toLowerCase();
  const reservedWords = ["lectorfenix", "lectorfenix", "admin", "owner", "staff", "moderador", "moderator", "soporte", "support", "system", "dueño", "dueno"];
  const hasReservedWord = reservedWords.some((word) => lowerUsername.includes(word));

  if (hasReservedWord && !profile?.is_admin) {
    return { error: "El nombre de usuario contiene términos reservados para el equipo oficial." };
  }

  if (profile?.username && profile?.username_updated_at) {
    const lastUpdate = new Date(profile.username_updated_at);
    const daysSince = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSince < 7) {
      const daysLeft = Math.ceil(7 - daysSince);
      return {
        error: `Solo puedes cambiar tu nombre de usuario una vez cada 7 días. Puedes volver a cambiarlo en ${daysLeft} día${daysLeft === 1 ? "" : "s"}.`,
      };
    }
  }

  try {
    await sql`
      INSERT INTO public.profiles (id, username, username_updated_at, updated_at)
      VALUES (${user.id}, ${trimmed}, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE
      SET username = EXCLUDED.username,
          username_updated_at = EXCLUDED.username_updated_at,
          updated_at = NOW()
    `;

    revalidatePath("/profile");
    return { success: true };
  } catch (error: any) {
    console.error("[updateUsername] DB error:", error);
    return { error: `Error al guardar: ${error.message}` };
  }
}

// ─── Upsert de perfil desde OAuth (Discord, etc.) ─────────────────────────
export async function upsertOAuthProfile(userId: string, discordUsername: string, avatarUrl?: string) {
  try {
    // Solo escribir username si el perfil aún no tiene uno
    const [existing] = await sql`
      SELECT username FROM public.profiles WHERE id = ${userId} LIMIT 1
    ` as any[];

    if (existing?.username) return;

    await sql`
      INSERT INTO public.profiles (id, username, avatar_url, updated_at)
      VALUES (${userId}, ${discordUsername}, ${avatarUrl ?? null}, NOW())
      ON CONFLICT (id) DO UPDATE
      SET username = COALESCE(profiles.username, EXCLUDED.username),
          avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url),
          updated_at = NOW()
    `;
  } catch (err) {
    console.error("[upsertOAuthProfile] error:", err);
  }
}

// ─── Subida de avatar ─────────────────────────────────────────────────────
const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg":  "jpg",
  "image/png":  "png",
  "image/webp": "webp",
};
const MAX_BYTES = 1_048_576; // 1 MB

export async function uploadAvatar(formData: FormData) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "No autorizado." };
  }

  const file = formData.get("avatar") as File | null;

  if (!file || file.size === 0) {
    return { error: "No se seleccionó ningún archivo." };
  }

  if (!ALLOWED_MIME[file.type]) {
    return { error: "Solo se permiten imágenes .jpg, .jpeg, .png o .webp." };
  }

  if (file.size > MAX_BYTES) {
    return { error: "La imagen es demasiado pesada. El tamaño máximo permitido es de 1 MB." };
  }

  const storagePath = `${user.id}/avatar`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(storagePath, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "3600",
    });

  if (uploadError) {
    console.error("[uploadAvatar] storage error:", uploadError.message, uploadError);
    return { error: `Error de Storage: ${uploadError.message}` };
  }

  const { data: { publicUrl } } = supabase.storage
    .from("avatars")
    .getPublicUrl(storagePath);

  const bustUrl = `${publicUrl}?t=${Date.now()}`;

  try {
    // Guardar URL en base de datos local
    await sql`
      INSERT INTO public.profiles (id, avatar_url, updated_at)
      VALUES (${user.id}, ${bustUrl}, NOW())
      ON CONFLICT (id) DO UPDATE
      SET avatar_url = EXCLUDED.avatar_url,
          updated_at = NOW()
    `;

    revalidatePath("/profile");
    return { success: true, url: bustUrl };
  } catch (profileError: any) {
    console.error("[uploadAvatar] profile update error:", profileError);
    return { error: `Imagen subida, pero no se pudo actualizar el perfil: ${profileError.message}` };
  }
}

// ─── Actualizar dirección de lectura ──────────────────────────────────────
export async function updateReadingDirection(direction: "vertical" | "horizontal") {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "No autorizado." };
  }

  try {
    await sql`
      INSERT INTO public.profiles (id, reading_direction, updated_at)
      VALUES (${user.id}, ${direction}, NOW())
      ON CONFLICT (id) DO UPDATE
      SET reading_direction = EXCLUDED.reading_direction,
          updated_at = NOW()
    `;

    revalidatePath("/profile");
    return { success: true };
  } catch (error: any) {
    console.error("[updateReadingDirection] DB error:", error);
    return { error: `Error al guardar preferencia: ${error.message}` };
  }
}

// ─── Programar eliminación de cuenta (período de gracia de 30 días) ───────────
export async function deleteAccountAction() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "No autorizado." };
  }

  const targetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.auth.updateUser({
    data: {
      scheduled_delete_at: targetDate
    }
  });

  if (error) {
    console.error("[deleteAccountAction] error updating user metadata:", error.message);
    return { error: `Error al programar la eliminación: ${error.message}` };
  }

  revalidatePath("/profile");
  return { success: true, targetDate };
}

// ─── Generación de código diario de Telegram ──────────────────────────────
export async function getDailyTelegramCode(username: string, offsetDays = 0, telegramId?: number) {
  const date = new Date();
  if (offsetDays !== 0) {
    date.setDate(date.getDate() + offsetDays);
  }
  const dateString = date.toISOString().split("T")[0];
  const salt = process.env.TELEGRAM_PREMIUM_SALT || "lectorfenix_secreto_salt_2026";
  const normalizedUsername = username.trim().toLowerCase();
  
  const tid = telegramId !== undefined ? telegramId : 0;
  const hash = crypto.createHash("md5").update(normalizedUsername + tid + dateString + salt).digest("hex");
  
  if (telegramId !== undefined) {
    return `LFX-${tid}-${hash.substring(0, 5).toUpperCase()}`;
  }
  return `LFX-${hash.substring(0, 5).toUpperCase()}`;
}

const failedAttemptsMap = new Map<string, { count: number; blockedUntil: number }>();

// ─── Activar cuenta Premium ──────────────────────────────────────────────
export async function upgradeToPremiumAction(type: "gifted" | "paid" = "paid", code?: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "No autorizado." };
  }

  let verifiedTelegramId: number | null = null;

  if (type === "gifted") {
    const userId = user.id;

    const attemptInfo = failedAttemptsMap.get(userId);
    if (attemptInfo && attemptInfo.blockedUntil > Date.now()) {
      const minutesLeft = Math.ceil((attemptInfo.blockedUntil - Date.now()) / 60000);
      return { error: `Demasiados intentos fallidos. Reintenta en ${minutesLeft} minutos.` };
    }

    if (!code) {
      return { error: "Código de activación requerido. Pídele tu código al bot de Telegram usando tu nombre de usuario." };
    }

    // Obtener perfil para el username del Postgres local
    const [profile] = await sql`
      SELECT username FROM public.profiles WHERE id = ${user.id} LIMIT 1
    ` as any[];

    if (!profile || !profile.username) {
      return { error: "Configura un nombre de usuario en tu perfil antes de reclamar el Pase Premium Gratis." };
    }

    const username = profile.username;
    const cleanCode = code.trim().toUpperCase();

    const parts = cleanCode.split("-");
    if (parts.length !== 3 || (parts[0] !== "LFX" && parts[0] !== "MST")) {
      return { error: "Código inválido o formato incorrecto." };
    }

    const telegramIdStr = parts[1];
    const receivedHash = parts[2];
    const telegramId = parseInt(telegramIdStr, 10);

    if (isNaN(telegramId)) {
      return { error: "Código inválido. ID de Telegram incorrecto." };
    }

    const codeToday = await getDailyTelegramCode(username, 0, telegramId);
    const codeYesterday = await getDailyTelegramCode(username, -1, telegramId);
    const codeTomorrow = await getDailyTelegramCode(username, 1, telegramId);

    if (cleanCode !== codeToday && cleanCode !== codeYesterday && cleanCode !== codeTomorrow) {
      const currentAttempts = attemptInfo ? attemptInfo.count + 1 : 1;
      if (currentAttempts >= 5) {
        failedAttemptsMap.set(userId, {
          count: currentAttempts,
          blockedUntil: Date.now() + 15 * 60 * 1000
        });
        return { error: "Código incorrecto. Tu cuenta fue bloqueada temporalmente por 15 minutos debido a demasiados intentos fallidos." };
      } else {
        failedAttemptsMap.set(userId, {
          count: currentAttempts,
          blockedUntil: 0
        });
        const remaining = 5 - currentAttempts;
        return { error: `Código incorrecto. Te quedan ${remaining} intentos antes del bloqueo de seguridad.` };
      }
    }

    verifiedTelegramId = telegramId;
    failedAttemptsMap.delete(userId);
  }

  const premiumUntilDate = type === "gifted" 
    ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    : null;

  // Actualizar en Postgres local
  try {
    await sql`
      INSERT INTO public.profiles (id, is_premium, premium_until, telegram_last_checked, telegram_grace_started, telegram_id, premium_type, updated_at)
      VALUES (
        ${user.id}, 
        true, 
        ${premiumUntilDate}, 
        ${type === "gifted" ? new Date().toISOString() : null}, 
        null, 
        ${verifiedTelegramId}, 
        ${type}, 
        NOW()
      )
      ON CONFLICT (id) DO UPDATE 
      SET is_premium = true,
          premium_until = EXCLUDED.premium_until,
          telegram_last_checked = EXCLUDED.telegram_last_checked,
          telegram_grace_started = null,
          telegram_id = COALESCE(EXCLUDED.telegram_id, profiles.telegram_id),
          premium_type = EXCLUDED.premium_type,
          updated_at = NOW()
    `;

    // Intentar sincronizar metadatos de Supabase Auth
    const existingPremiumSince = user.user_metadata?.premium_since;
    if (!existingPremiumSince) {
      try {
        await supabase.auth.updateUser({
          data: {
            premium_since: new Date().toISOString()
          }
        });
      } catch (authMetaErr: any) {
        console.warn("[upgradeToPremiumAction] failed to update auth metadata:", authMetaErr.message);
      }
    }

    revalidatePath("/profile");
    return { success: true };
  } catch (error: any) {
    console.error("[upgradeToPremiumAction] DB error:", error);
    return { error: `Error al activar Premium: ${error.message}` };
  }
}

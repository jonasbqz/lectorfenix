"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, CheckCircle2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { createClient } from "../../utils/supabase/client";
import { toast } from "sonner";

import { C } from "../lib/colors";


export default function ResetPasswordPage() {
  const supabase = createClient();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // 1. Verificamos si ya hay sesión al montar
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true);
      }
    });

    // 2. Escuchamos cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password.length < 8) {
      setErrorMsg("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setErrorMsg("Las contraseñas no coinciden. Verificalas e inténtalo de nuevo.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setDone(true);
    toast.success("Contraseña restablecida correctamente.");
    setTimeout(() => router.push("/"), 2500);
  };

  // loader mientras verifica
  if (!ready && !done) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 bg-transparent">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[#ff6b00]" />
          <p className="text-sm" style={{ color: C.dim }}>Verificando enlace de recuperación...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 bg-transparent">
      <div
        className="w-full max-w-[380px] rounded-2xl p-8 animate-soft-enter"
        style={{
          background: C.bgCard,
          border: `1px solid ${C.border}`,
          boxShadow: "0 40px 80px rgba(0,0,0,0.6)",
        }}
      >
        {done ? (
          <div className="flex flex-col items-center text-center gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl animate-pulse"
              style={{ background: "rgba(255, 107, 0, 0.10)", border: "1px solid rgba(255, 107, 0, 0.25)" }}
            >
              <CheckCircle2 size={26} style={{ color: C.accent }} />
            </div>
            <h1 className="text-lg font-bold" style={{ color: C.fg }}>¡Contraseña actualizada!</h1>
            <p className="text-xs" style={{ color: C.dim }}>Redirigiendo al inicio...</p>
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-col items-center gap-2 text-center">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ background: "rgba(255, 107, 0, 0.08)", border: `1px solid rgba(255, 107, 0, 0.18)` }}
              >
                <Lock size={20} style={{ color: C.accent }} />
              </div>
              <h1 className="text-base font-bold" style={{ color: C.fg }}>Nueva contraseña</h1>
              <p className="text-xs" style={{ color: C.dim }}>Ingresá tu nueva contraseña para continuar.</p>
            </div>

            {errorMsg && (
              <div
                className="mb-4 flex items-start gap-2.5 rounded-xl px-4 py-3"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)" }}
              >
                <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-400" />
                <p className="text-xs leading-relaxed text-red-300">{errorMsg}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Nueva contraseña */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: C.dim }}>
                  Nueva contraseña
                </label>
                <div
                  className="flex items-center gap-2.5 rounded-xl px-3.5 py-3 transition-all duration-200"
                  style={{ background: C.bgInput, border: `1px solid ${C.border}` }}
                >
                  <Lock size={14} className="shrink-0" style={{ color: C.dim }} />
                  <input
                    type={showPwd ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="flex-1 bg-transparent text-sm outline-none"
                    style={{ color: C.fg }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((p) => !p)}
                    className="transition-colors"
                    style={{ color: C.dim }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.fg; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.dim; }}
                  >
                    {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Confirmar */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: C.dim }}>
                  Confirmar contraseña
                </label>
                <div
                  className="flex items-center gap-2.5 rounded-xl px-3.5 py-3 transition-all duration-200"
                  style={{ background: C.bgInput, border: `1px solid ${C.border}` }}
                >
                  <Lock size={14} className="shrink-0" style={{ color: C.dim }} />
                  <input
                    type={showPwd ? "text" : "password"}
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repetí la contraseña"
                    className="flex-1 bg-transparent text-sm outline-none"
                    style={{ color: C.fg }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-1 w-full rounded-xl py-3 text-sm font-bold transition-all duration-200 disabled:opacity-50"
                style={{
                  background: `linear-gradient(135deg, ${C.accent}, ${C.accentStrong})`,
                  color: C.accentText,
                  boxShadow: "0 4px 24px rgba(255, 107, 0, 0.22)",
                }}
              >
                {loading ? "Guardando..." : "Guardar contraseña"}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}

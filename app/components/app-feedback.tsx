"use client";

import { useEffect, useState } from "react";
import { Toaster, toast } from "sonner";

const COOKIE_CONSENT_KEY = "mangastoon_cookie_consent";

export default function AppFeedback() {
  const [showCookieBanner, setShowCookieBanner] = useState(false);

  useEffect(() => {
    setShowCookieBanner(localStorage.getItem(COOKIE_CONSENT_KEY) !== "true");
  }, []);

  function acceptCookies() {
    localStorage.setItem(COOKIE_CONSENT_KEY, "true");
    setShowCookieBanner(false);
    toast.success("Preferencias guardadas");
  }

  return (
    <>
      <Toaster
        richColors
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#141519",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#fff",
          },
        }}
      />

      {showCookieBanner ? (
        <div className="fixed inset-x-0 bottom-0 z-[9998] px-4 pb-4">
          <div className="mx-auto flex max-w-4xl flex-col gap-4 rounded-2xl border border-white/10 bg-[#101116]/95 p-4 shadow-2xl shadow-black/50 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
            <p className="text-sm leading-6 text-gray-300">
              Usamos cookies técnicas y almacenamiento local para guardar idioma, preferencias +18 y progreso de lectura.
            </p>
            <button
              type="button"
              onClick={acceptCookies}
              className="shrink-0 rounded-full bg-orange-500 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-600"
            >
              Aceptar
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

"use client";

import { Lock, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLanguage } from "./language-provider";
import type { SupportedLanguage } from "./language-provider";

const COPY = {
  es: {
    title: "Contenido Adulto (+18)",
    body: "Este manga contiene escenas o material explícito. Para continuar leyendo, por favor activa el filtro +18.",
    btnActivate: "Activar +18",
    btnBack: "Volver al Inicio",
  },
  en: {
    title: "Adult Content (+18)",
    body: "This manga contains explicit scenes or material. To continue reading, please enable the +18 filter.",
    btnActivate: "Enable +18",
    btnBack: "Back to Home",
  },
  pt: {
    title: "Conteúdo Adulto (+18)",
    body: "Este mangá contém cenas ou material explícito. Para continuar lendo, por favor ative o filtro +18.",
    btnActivate: "Ativar +18",
    btnBack: "Voltar ao Início",
  },
};

export default function AdultContentBlocker({ lang }: { lang: SupportedLanguage }) {
  const router = useRouter();
  const { setAdult } = useLanguage();
  const copy = COPY[lang] || COPY.es;

  const handleActivate = () => {
    setAdult(true);
    // Reload page to reflect changes
    window.location.reload();
  };

  const handleBack = () => {
    router.push("/");
  };

  return (
    <div className="fixed inset-0 z-[9998] flex h-[100dvh] w-[100dvw] items-center justify-center bg-[#0a0908]/95 p-4 pb-20 md:pb-28 backdrop-blur-md">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-rose-500/20 bg-[#141211]/90 p-8 text-center shadow-[0_0_50px_rgba(239,68,68,0.15)]">
        {/* Glow behind icon */}
        <div className="absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />

        <div className="relative mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
            <ShieldAlert size={32} />
          </div>
        </div>

        <h2 className="mb-3 text-xl font-bold tracking-tight text-white md:text-2xl">
          {copy.title}
        </h2>
        <p className="mb-8 text-sm text-neutral-400 leading-relaxed px-2">
          {copy.body}
        </p>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleActivate}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 py-3 text-sm font-bold text-white shadow-lg shadow-rose-500/25 transition-all hover:from-rose-500 hover:to-rose-400 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Lock size={16} />
            <span>{copy.btnActivate}</span>
          </button>
          
          <button
            type="button"
            onClick={handleBack}
            className="w-full cursor-pointer rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-neutral-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            {copy.btnBack}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import type { SupportedLanguage } from "./site-header";
import { useLanguage } from "./language-provider";

const UI_COPY: Record<
  SupportedLanguage,
  {
    label: string;
    title: string;
    descriptionStart: string;
    descriptionEnd: string;
    cancel: string;
    confirm: string;
    footer: string;
  }
> = {
  es: {
    label: "+18 Adulto",
    title: "Contenido para Adultos",
    descriptionStart: "Estas a punto de entrar a una zona",
    descriptionEnd:
      "con material erotico y explicito destinado exclusivamente a mayores de 18 anos. Tienes 18 anos o mas?",
    cancel: "No, regresar a un lugar seguro",
    confirm: "Si, soy mayor de 18 anos",
    footer: "Al entrar, confirmas tu mayoria de edad",
  },
  en: {
    label: "+18 Adult",
    title: "Adult Content",
    descriptionStart: "You are about to enter an",
    descriptionEnd:
      "area containing erotic and explicit material strictly intended for adults only. Are you 18 years old or older?",
    cancel: "No, take me back somewhere safe",
    confirm: "Yes, I am over 18 years old",
    footer: "By entering, you confirm that you are of legal age",
  },
  pt: {
    label: "+18 Adulto",
    title: "Conteudo Adulto",
    descriptionStart: "Voce esta prestes a entrar em uma area",
    descriptionEnd:
      "com material erotico e explicito destinado exclusivamente a maiores de 18 anos. Voce tem 18 anos ou mais?",
    cancel: "Nao, voltar para um lugar seguro",
    confirm: "Sim, sou maior de 18 anos",
    footer: "Ao entrar, voce confirma que e maior de idade",
  },
};

export default function AdultToggle({ language }: { language: SupportedLanguage }) {
  const { isAdult, setAdult } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [showAgeModal, setShowAgeModal] = useState(false);
  const copy = UI_COPY[language];

  useEffect(() => {
    setMounted(true);
    const adultState = localStorage.getItem("mangastoon_adult") === "true";
    setAdult(adultState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mounted || !showAgeModal) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mounted, showAgeModal]);

  function handleAdultToggle(nextAdult: boolean) {
    if (nextAdult) {
      setShowAgeModal(true);
      return;
    }

    localStorage.setItem("mangastoon_adult", "false");
    setAdult(false);
    toast.success("Modo +18 desactivado");
    window.setTimeout(() => window.location.reload(), 450);
  }

  function handleConfirm() {
    localStorage.setItem("mangastoon_adult", "true");
    setAdult(true);
    setShowAgeModal(false);
    toast.success("Modo +18 activado");
    window.setTimeout(() => window.location.reload(), 450);
  }

  if (!mounted) {
    return null;
  }

  return (
    <>
      <label
        className="flex cursor-pointer items-center gap-2 text-left"
      >
        <span className="hidden text-sm text-gray-400 lg:inline">Contenido +18</span>
        <span className="relative inline-flex items-center">
          <input
            type="checkbox"
            checked={isAdult}
            onChange={(event) => handleAdultToggle(event.target.checked)}
            className="peer sr-only"
          />
          <span className="h-5 w-9 rounded-full bg-[#2c2d33] transition-colors peer-checked:bg-rose-600" />
          <div
            className="pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4"
          />
        </span>
      </label>

      {showAgeModal && mounted
        ? createPortal(
            (
              <div
                className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#050505]/90 p-6 backdrop-blur-[20px] animate-in fade-in duration-500"
                role="dialog"
                aria-modal="true"
                aria-labelledby="age-verify-title"
              >
                <div className="relative w-full max-w-[480px] overflow-hidden rounded-[40px] border border-white/10 bg-white/[0.03] p-12 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl animate-in fade-in zoom-in duration-500">
                  <div
                    className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-600/10 blur-[120px]"
                    aria-hidden
                  />

                  <div className="mx-auto mb-8 flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-rose-700 p-[2px] shadow-[0_0_40px_rgba(225,29,72,0.3)]">
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-[#0a0a0a]">
                      <span className="text-3xl font-black tracking-tighter text-white">+18</span>
                    </div>
                  </div>

                  <h2
                    id="age-verify-title"
                    className="mb-4 text-center text-4xl font-extrabold leading-tight tracking-tight text-white"
                  >
                    {copy.title}
                  </h2>
                  <p className="mx-auto mb-10 max-w-[280px] text-center text-sm leading-relaxed text-white/50">
                    {copy.descriptionStart}{" "}
                    <span className="text-rose-500/80">NSFW</span> {copy.descriptionEnd}
                  </p>

                  <button
                    type="button"
                    onClick={handleConfirm}
                    className="group relative w-full overflow-hidden rounded-2xl bg-rose-600 py-5 font-bold text-white shadow-[0_10px_20px_rgba(225,29,72,0.2)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span
                      className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
                      aria-hidden
                    />
                    <span className="relative z-10">{copy.confirm}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAgeModal(false)}
                    className="mt-4 w-full rounded-2xl border border-white/5 bg-white/[0.05] py-4 font-medium text-white/70 transition-all hover:bg-white/[0.08]"
                  >
                    {copy.cancel}
                  </button>

                  <div className="mt-8 flex items-center justify-center gap-2 text-xs text-white/35">
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-white/40" />
                    <span>{copy.footer}</span>
                  </div>
                </div>
              </div>
            ),
            document.body
          )
        : null}
    </>
  );
}

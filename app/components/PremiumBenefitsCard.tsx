"use client";

import { Check, Sparkles, Zap, Shield, FileText, Palette, Volume2 } from "lucide-react";
import type { SupportedLanguage } from "./language-provider";

const COPY = {
  es: {
    title: "Beneficios Premium",
    subtitle: "Lleva tu lectura al siguiente nivel",
    unlimitedPdf: "Descarga PDF ampliada",
    unlimitedPdfDesc: "Genera archivos de hasta 50 capítulos (Free: máx. 10).",
    noAds: "Sin anuncios molestos",
    noAdsDesc: "Lectura 100% limpia y sin interrupciones publicitarias.",
    themes: "Temas de lectura exclusivos",
    themesDesc: "Modos Sepia, AMOLED, Gris y más para cuidar tus ojos.",
    scroll: "Auto-scroll de alta velocidad",
    scrollDesc: "Accede a velocidades extra de 4x y 5x para lectura rápida.",
    badge: "Insignia VIP en tu Perfil",
    badgeDesc: "Destaca en la comunidad con tu corona premium.",
    upgradeBtn: "¡Subir a Premium!",
  },
  en: {
    title: "Premium Benefits",
    subtitle: "Take your reading to the next level",
    unlimitedPdf: "Extended PDF Downloads",
    unlimitedPdfDesc: "Generate files with up to 50 chapters (Free: max. 10).",
    noAds: "No annoying ads",
    noAdsDesc: "100% clean reading experience without ad interruptions.",
    themes: "Exclusive reading themes",
    themesDesc: "Sepia, AMOLED, Gray, and more themes to ease eye strain.",
    scroll: "High-speed auto-scroll",
    scrollDesc: "Unlock extra 4x and 5x speeds for ultra-fast reading.",
    badge: "VIP Badge on Profile",
    badgeDesc: "Stand out in the community with your premium crown.",
    upgradeBtn: "Upgrade to Premium!",
  },
  pt: {
    title: "Benefícios Premium",
    subtitle: "Leve sua leitura para o próximo nível",
    unlimitedPdf: "Downloads em PDF estendidos",
    unlimitedPdfDesc: "Gere arquivos com até 50 capítulos (Grátis: máx. 10).",
    noAds: "Sem anúncios chatos",
    noAdsDesc: "Leitura 100% limpa e sem interrupções de publicidade.",
    themes: "Temas de leitura exclusivos",
    themesDesc: "Temas Sepia, AMOLED, Cinza e mais para relaxar os olhos.",
    scroll: "Auto-scroll de alta velocidade",
    scrollDesc: "Desbloqueie velocidades extras de 4x e 5x para leitura rápida.",
    badge: "Símbolo VIP no Perfil",
    badgeDesc: "Destaque-se na comunidade com sua coroa premium.",
    upgradeBtn: "Assinar o Premium!",
  },
};

export default function PremiumBenefitsCard({
  lang = "es",
  onUpgrade,
  isLoggedIn = true,
}: {
  lang?: SupportedLanguage;
  onUpgrade?: () => void;
  isLoggedIn?: boolean;
}) {
  const copy = COPY[lang] || COPY.es;

  const buttonText = isLoggedIn 
    ? copy.upgradeBtn 
    : (lang === "en" 
        ? "Sign Up / Log In" 
        : lang === "pt" 
          ? "Registrar / Entrar" 
          : "Registrarse / Iniciar Sesión");

  return (
    <div className="relative overflow-hidden rounded-3xl border border-orange-500/20 bg-gradient-to-b from-[#181922]/90 to-[#0c0d12]/95 p-6 shadow-2xl backdrop-blur-xl md:p-8">
      {/* Background decoration */}
      <div className="absolute right-0 top-0 h-40 w-40 -translate-y-12 translate-x-12 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />
      <div className="absolute left-0 bottom-0 h-40 w-40 translate-y-12 -translate-x-12 rounded-full bg-rose-500/5 blur-3xl pointer-events-none" />

      <div className="relative flex flex-col items-center text-center mb-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-orange-500 to-rose-500 text-black shadow-lg shadow-orange-500/20 animate-pulse">
          <Sparkles size={22} className="stroke-[2.5]" />
        </div>
        <h3 className="mt-4 text-xl font-black text-white tracking-tight md:text-2xl">
          {copy.title}
        </h3>
        <p className="mt-1.5 text-xs text-neutral-400 font-medium">
          {copy.subtitle}
        </p>
      </div>

      <div className="relative flex flex-col gap-5">
        {/* PDF limit benefit */}
        <div className="flex items-start gap-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400">
            <FileText size={18} />
          </div>
          <div className="text-left">
            <h4 className="text-sm font-bold text-gray-200">{copy.unlimitedPdf}</h4>
            <p className="mt-0.5 text-xs text-neutral-400 leading-normal">{copy.unlimitedPdfDesc}</p>
          </div>
        </div>

        {/* No Ads benefit */}
        <div className="flex items-start gap-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
            <Shield size={18} />
          </div>
          <div className="text-left">
            <h4 className="text-sm font-bold text-gray-200">{copy.noAds}</h4>
            <p className="mt-0.5 text-xs text-neutral-400 leading-normal">{copy.noAdsDesc}</p>
          </div>
        </div>

        {/* Custom themes benefit */}
        <div className="flex items-start gap-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
            <Palette size={18} />
          </div>
          <div className="text-left">
            <h4 className="text-sm font-bold text-gray-200">{copy.themes}</h4>
            <p className="mt-0.5 text-xs text-neutral-400 leading-normal">{copy.themesDesc}</p>
          </div>
        </div>

        {/* Auto Scroll speed benefit */}
        <div className="flex items-start gap-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-500/10 text-green-400">
            <Zap size={18} />
          </div>
          <div className="text-left">
            <h4 className="text-sm font-bold text-gray-200">{copy.scroll}</h4>
            <p className="mt-0.5 text-xs text-neutral-400 leading-normal">{copy.scrollDesc}</p>
          </div>
        </div>

        {/* Premium badge benefit */}
        <div className="flex items-start gap-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
            <Sparkles size={18} />
          </div>
          <div className="text-left">
            <h4 className="text-sm font-bold text-gray-200">{copy.badge}</h4>
            <p className="mt-0.5 text-xs text-neutral-400 leading-normal">{copy.badgeDesc}</p>
          </div>
        </div>
      </div>

      {onUpgrade && (
        <button
          type="button"
          onClick={onUpgrade}
          className="mt-8 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 py-3.5 text-sm font-black text-black shadow-lg shadow-orange-500/25 transition-all duration-300 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Sparkles size={16} className="fill-black" />
          <span>{buttonText}</span>
        </button>
      )}
    </div>
  );
}

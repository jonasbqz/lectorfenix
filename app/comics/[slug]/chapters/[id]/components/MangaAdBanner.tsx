"use client";

import { Crown, AlertCircle, Play } from "lucide-react";
import { SupportedLanguage } from "../../../../../components/language-provider";

interface MangaAdBannerProps {
  index: number;
  onUpgrade: () => void;
  lang: SupportedLanguage;
}

const AD_COPY = {
  es: {
    removeAds: "Quitar Anuncios con Premium Gratis 💎",
    sponsored: "Patrocinado",
    playNow: "Jugar Ahora",
    claimGift: "Reclamar Regalo",
    betNow: "Apuntar/Girar",
    ads: [
      {
        title: "🔥 ¡JUEGO RPG ANIME DEL AÑO! 🔥",
        desc: "Recluta guerreras poderosas, forma alianzas y derrota jefes legendarios en batallas 3D en tiempo real. ¡Juega 100% gratis en tu navegador!",
        badge: "Recomendado",
        cta: "Jugar Gratis"
      },
      {
        title: "🎲 ¡MangaSlots: 500 Giros de Bienvenida! 🎲",
        desc: "Probá tu suerte en la ruleta de anime. Multiplicá tus monedas y ganá premios exclusivos todas las semanas. ¡Solo para mayores de 18!",
        badge: "18+ Caliente",
        cta: "Girar Ruleta"
      },
      {
        title: "👑 ¿Cansado de la Publicidad Molesta? 👑",
        desc: "Unite a nuestro grupo oficial de Telegram y reclamá tu Pase Premium Gratis. Disfrutá de lectura limpia, modo horizontal y descargas PDF extendidas.",
        badge: "MangaStoon Pro",
        cta: "Activar Premium Gratis"
      }
    ]
  },
  en: {
    removeAds: "Remove Ads with Free Premium 💎",
    sponsored: "Sponsored Ad",
    playNow: "Play Now",
    claimGift: "Claim Gift",
    betNow: "Spin Now",
    ads: [
      {
        title: "🔥 ANIME RPG OF THE YEAR! 🔥",
        desc: "Recruit powerful warriors, build guilds, and defeat legendary bosses in real-time 3D battles. Play 100% free in your browser now!",
        badge: "Hot Game",
        cta: "Play Free"
      },
      {
        title: "🎲 MangaSlots: 500 Free Welcome Spins! 🎲",
        desc: "Try your luck on the anime slots. Multiply your tokens and win exclusive weekly rewards. 18+ only.",
        badge: "18+ Adult",
        cta: "Spin Now"
      },
      {
        title: "👑 Tired of Annoying Ads? 👑",
        desc: "Join our official Telegram group and claim your Free Premium Pass. Enjoy ad-free reading, horizontal mode, and extended PDF downloads.",
        badge: "MangaStoon Pro",
        cta: "Get Free Premium"
      }
    ]
  },
  pt: {
    removeAds: "Remover Anúncios com Premium Grátis 💎",
    sponsored: "Patrocinado",
    playNow: "Jogar Agora",
    claimGift: "Resgatar Presente",
    betNow: "Girar Agora",
    ads: [
      {
        title: "🔥 RPG DE ANIME DO ANO! 🔥",
        desc: "Recrute guerreiras poderosas, crie alianças e vença chefes lendários em batalhas 3D em tempo real. Jogue 100% grátis no navegador!",
        badge: "Recomendado",
        cta: "Jogar Grátis"
      },
      {
        title: "🎲 MangaSlots: 500 Rodadas Grátis! 🎲",
        desc: "Tente sua sorte na roleta de anime. Multiplique suas moedas e ganhe prêmios semanais exclusivos. Apenas para maiores de 18 anos.",
        badge: "18+ Quente",
        cta: "Girar Agora"
      },
      {
        title: "👑 Cansado de Publicidades Irritantes? 👑",
        desc: "Entre no nosso grupo oficial do Telegram e resgate seu Passe Premium Grátis. Desfrute de leitura limpa, modo horizontal e downloads em PDF.",
        badge: "MangaStoon Pro",
        cta: "Ativar Premium Grátis"
      }
    ]
  }
};

export default function MangaAdBanner({ index, onUpgrade, lang }: MangaAdBannerProps) {
  const t = AD_COPY[lang as keyof typeof AD_COPY] || AD_COPY.es;
  
  // Rotar anuncios según el índice de página para que no se repita siempre el mismo
  const adIndex = (Math.floor(index / 5) - 1) % t.ads.length;
  const resolvedAdIndex = adIndex >= 0 ? adIndex : 0;
  const ad = t.ads[resolvedAdIndex];

  const handleClick = () => {
    // Si es el anuncio de MangaStoon Pro (Premium), abrimos el modal de upgrade
    if (resolvedAdIndex === 2) {
      onUpgrade();
    } else {
      // Si son los otros anuncios de Monetag, abrimos el Direct Link de Monetag en pestaña nueva
      if (typeof window !== "undefined") {
        window.open("https://go.transferzenad.com/link?zoneId=11014955", "_blank", "noopener,noreferrer");
      }
    }
  };

  return (
    <div className="w-full my-6 px-4 flex flex-col items-center">
      <div 
        onClick={handleClick}
        className="w-full max-w-2xl rounded-2xl p-5 border relative overflow-hidden transition-all duration-300 hover:border-amber-500/30 cursor-pointer group hover:scale-[1.01]"
        style={{
          background: "linear-gradient(135deg, rgba(20, 18, 16, 0.9) 0%, rgba(13, 12, 11, 0.95) 100%)",
          borderColor: "rgba(255, 255, 255, 0.04)",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)"
        }}
      >
        {/* Glow sutil de fondo */}
        <div className="absolute right-0 bottom-0 h-24 w-24 rounded-full bg-orange-500/5 blur-xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            {/* Header del anuncio */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] font-heading font-black tracking-widest text-zinc-500 uppercase border border-zinc-700/50 px-1.5 py-0.5 rounded bg-black/40">
                {t.sponsored}
              </span>
              <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                {ad.badge}
              </span>
            </div>
            
            {/* Título */}
            <h4 className="text-sm font-heading font-extrabold text-white tracking-wide uppercase leading-tight group-hover:text-amber-400 transition-colors">
              {ad.title}
            </h4>
            
            {/* Descripción */}
            <p className="mt-1 text-xs text-neutral-400 leading-relaxed font-medium">
              {ad.desc}
            </p>
          </div>

          {/* Botones de acción */}
          <div className="flex flex-row sm:flex-col items-center justify-between sm:justify-start w-full sm:w-auto gap-2.5 pt-3 sm:pt-0 border-t border-white/5 sm:border-0 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation(); // Evitar abrir el direct link
                onUpgrade();
              }}
              className="text-[10px] font-heading font-bold text-amber-500 hover:text-amber-400 hover:underline transition-all flex items-center gap-1 py-1"
            >
              <Crown size={12} className="text-amber-500 fill-amber-500/20" />
              <span>{t.removeAds}</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation(); // Evitar doble ejecución
                handleClick();
              }}
              className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-black text-xs font-heading font-black transition-all hover:scale-[1.03] active:scale-95 flex items-center gap-1.5 shadow-md shadow-orange-500/10"
            >
              <Play size={10} className="fill-black stroke-black" />
              <span>{ad.cta}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

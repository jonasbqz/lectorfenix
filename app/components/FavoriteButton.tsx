"use client";

import { Heart } from "lucide-react";
import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { toast } from "sonner";
import { useFavoritesStore, type FavoriteManga } from "../store/useFavoritesStore";
import { buildComicPath } from "../utils/slugify";
import { createClient } from "../../utils/supabase/client";
import SuggestSignUpModal from "./SuggestSignUpModal";

type FavoriteButtonProps = {
  manga?: FavoriteManga;
  mangaId?: string;
  title?: string;
  label?: string;
  variant?: "floating" | "inline" | "compact";
};

function buildFavoriteManga({ manga, mangaId, title }: FavoriteButtonProps): FavoriteManga | null {
  if (manga) {
    return manga;
  }

  if (!mangaId) {
    return null;
  }

  return {
    id: mangaId,
    mangaDexId: mangaId,
    title: title ?? "Manga",
    url: buildComicPath(title ?? "Manga", mangaId),
    titleMap: title ? { es: title, en: title, pt: title } : undefined,
    images: {},
  };
}

function getMangaId(manga: FavoriteManga | null) {
  return manga?.id ?? manga?.mangaDexId ?? null;
}

export default function FavoriteButton(props: FavoriteButtonProps) {
  const { isFavorite, addFavorite, removeFavorite } = useFavoritesStore();
  const [mounted, setMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  
  const supabase = useMemo(() => createClient(), []);
  const manga = useMemo(() => buildFavoriteManga(props), [props]);
  const mangaId = getMangaId(manga);
  const variant = props.variant ?? (props.manga ? "floating" : "inline");

  useEffect(() => {
    setMounted(true);
    
    // Escuchar estado de autenticación
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session?.user);
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user);
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  if (!mounted || !manga || !mangaId) {
    return null;
  }

  const isFav = isFavorite(mangaId);

  const toggleFavorite = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (isFav) {
      removeFavorite(mangaId);
      toast.success("Eliminado de favoritos");
      return;
    }

    addFavorite(manga);
    toast.success("Agregado a favoritos");

    // Lógica para mostrar la sugerencia de registro a usuarios invitados
    if (!isLoggedIn) {
      try {
        const rawCount = localStorage.getItem("lectorfenix_anon_fav_count") || "0";
        const count = parseInt(rawCount, 10) + 1;
        localStorage.setItem("lectorfenix_anon_fav_count", count.toString());

        const lastPromptRaw = localStorage.getItem("lectorfenix_last_signup_prompt");
        const lastPromptTime = lastPromptRaw ? parseInt(lastPromptRaw, 10) : 0;
        const now = Date.now();

        // 3 días de cooldown
        const cooldown = 3 * 24 * 60 * 60 * 1000;

        if (count % 3 === 0 && now - lastPromptTime > cooldown) {
          setShowSuggestModal(true);
          localStorage.setItem("lectorfenix_last_signup_prompt", now.toString());
        }
      } catch (err) {
        console.error("[FavoriteButton] Error al procesar spam limits en localStorage:", err);
      }
    }
  };

  const buttonContent = (
    <>
      {variant === "inline" && (
        <button
          type="button"
          onClick={toggleFavorite}
          className={`flex items-center justify-center transition-all duration-300 active:scale-95 w-full
            rounded-lg border px-2.5 py-1.5 text-xs font-semibold
            ${
              isFav
                ? "border-[#ff6b00]/30 bg-[#ff6b00]/10 text-[#ff6b00] shadow-[0_0_15px_rgba(255,107,0,0.08)] hover:bg-[#ff6b00]/15"
                : "border-white/10 bg-white/5 text-gray-300 hover:text-white hover:border-white/20 hover:bg-white/10"
            }`}
        >
          <Heart className={`h-4 w-4 md:h-4.5 md:w-4.5 ${isFav ? "fill-current" : ""}`} />
        </button>
      )}

      {variant === "compact" && (
        <button
          type="button"
          aria-label={isFav ? "Quitar de favoritos" : "Agregar a favoritos"}
          onClick={toggleFavorite}
          className={`rounded-full p-1.5 backdrop-blur-md transition-all border ${
            isFav 
              ? "bg-[#ff6b00]/15 border-[#ff6b00]/40 text-[#ff6b00]" 
              : "bg-black/60 border-white/10 text-white hover:bg-[#ff6b00]/15 hover:border-[#ff6b00]/30 hover:text-[#ff6b00]"
          }`}
        >
          <Heart className={`h-4 w-4 ${isFav ? "fill-orange-500" : ""}`} />
        </button>
      )}

      {variant === "floating" && (
        <button
          type="button"
          aria-label={isFav ? "Quitar de favoritos" : "Agregar a favoritos"}
          onClick={toggleFavorite}
          className={`absolute right-2 top-2 z-30 rounded-full p-2 backdrop-blur-md transition-all border ${
            isFav 
              ? "bg-[#ff6b00]/15 border-[#ff6b00]/40 text-[#ff6b00]" 
              : "bg-black/50 border-white/10 text-white hover:bg-[#ff6b00]/15 hover:border-[#ff6b00]/30 hover:text-[#ff6b00]"
          }`}
        >
          <Heart
            size={20}
            className={`transition-all duration-300 ${
              isFav ? "scale-110 fill-[#ff6b00] text-[#ff6b00]" : "hover:scale-110"
            }`}
          />
        </button>
      )}
    </>
  );

  return (
    <>
      {buttonContent}
      <SuggestSignUpModal
        open={showSuggestModal}
        onClose={() => setShowSuggestModal(false)}
      />
    </>
  );
}

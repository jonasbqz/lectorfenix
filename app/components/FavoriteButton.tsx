"use client";

import { Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type FavoriteManga = {
  id: string;
  title: string;
};

const FAVORITES_KEY = "mangastoon_favorites";

function readFavorites() {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]") as FavoriteManga[];
  } catch {
    return [];
  }
}

export default function FavoriteButton({
  mangaId,
  title,
  label,
}: {
  mangaId: string;
  title: string;
  label: string;
}) {
  const [favorite, setFavorite] = useState(false);

  useEffect(() => {
    setFavorite(readFavorites().some((item) => item.id === mangaId));
  }, [mangaId]);

  function toggleFavorite() {
    const favorites = readFavorites();
    const exists = favorites.some((item) => item.id === mangaId);
    const nextFavorites = exists
      ? favorites.filter((item) => item.id !== mangaId)
      : [{ id: mangaId, title }, ...favorites];

    localStorage.setItem(FAVORITES_KEY, JSON.stringify(nextFavorites));
    setFavorite(!exists);
    toast.success(exists ? "Eliminado de favoritos" : "Agregado a favoritos");
  }

  return (
    <button
      type="button"
      onClick={toggleFavorite}
      className={`flex items-center gap-3 text-sm transition-colors ${
        favorite ? "text-rose-500" : "text-gray-400 hover:text-rose-500"
      }`}
    >
      <Heart className={`h-4 w-4 ${favorite ? "fill-current" : ""}`} />
      <span>{label}</span>
    </button>
  );
}

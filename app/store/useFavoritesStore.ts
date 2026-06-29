import { create } from "zustand";
import { persist } from "zustand/middleware";
import { addFavoriteAction, removeFavoriteAction, getFavoritesAction } from "../actions/favorites";

export interface FavoriteManga {
  id?: string;
  mangaDexId?: string | null;
  title?: string;
  score?: number | null;
  url?: string;
  titleMap?: Record<string, string>;
  altTitles?: Record<string, string>[];
  originalLanguage?: string;
  themes?: string[];
  tags?: string[];
  genres?: Array<{ mal_id: number; name: string }>;
  isNsfw?: boolean;
  latestChapters?: { chapter: string; timeAgo: string; publishedAt?: string | null }[];
  images?: {
    webp?: { large_image_url?: string | null; image_url?: string | null };
    jpg?: { large_image_url?: string | null; image_url?: string | null };
  };
}

interface FavoritesState {
  favorites: FavoriteManga[];
  addFavorite: (manga: FavoriteManga) => Promise<void>;
  removeFavorite: (mangaId: string) => Promise<void>;
  isFavorite: (mangaId: string) => boolean;
  syncWithServer: () => Promise<void>;
  reset: () => void;
}

function getFavoriteId(manga: FavoriteManga) {
  return manga.mangaDexId ?? manga.id ?? null;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],

      addFavorite: async (manga) => {
        const mangaId = getFavoriteId(manga);
        if (!mangaId) return;

        // 1. Actualización optimista local en Zustand
        set((state) => {
          if (state.favorites.some((item) => getFavoriteId(item) === mangaId)) {
            return state;
          }
          return { favorites: [manga, ...state.favorites] };
        });

        // 2. Persistir en Supabase si está logueado
        try {
          const res = await addFavoriteAction(mangaId, manga);
          if (res && res.error === "unauthenticated") {
            // Usuario anónimo, se queda puramente local. Sin problemas.
          }
        } catch (err) {
          console.error("[useFavoritesStore] Failed to add favorite to Supabase:", err);
        }
      },

      removeFavorite: async (mangaId) => {
        // 1. Actualización optimista local
        set((state) => ({
          favorites: state.favorites.filter((manga) => getFavoriteId(manga) !== mangaId),
        }));

        // 2. Eliminar en Supabase
        try {
          const res = await removeFavoriteAction(mangaId);
          if (res && res.error === "unauthenticated") {
            // Anónimo, puramente local
          }
        } catch (err) {
          console.error("[useFavoritesStore] Failed to remove favorite from Supabase:", err);
        }
      },

      isFavorite: (mangaId) => {
        return get().favorites.some((manga) => getFavoriteId(manga) === mangaId);
      },

      syncWithServer: async () => {
        // Asegurarse de que el store esté hidratado antes de sincronizar,
        // evitando pisar el localStorage con un estado vacío [].
        if (useFavoritesStore.persist && !useFavoritesStore.persist.hasHydrated()) {
          await new Promise<void>((resolve) => {
            const unsub = useFavoritesStore.persist.onFinishHydration(() => {
              unsub();
              resolve();
            });
          });
        }

        try {
          const res = await getFavoritesAction();
          if (!res || res.error) {
            // Si da desautenticado o error de tabla, mantenemos el localStorage local
            return;
          }

          const dbFavorites = res.favorites || [];
          const localFavorites = get().favorites;

          // Merge: Cargar locales que no estén en la BD
          const mergedList = [...dbFavorites];
          
          for (const localManga of localFavorites) {
            const localId = getFavoriteId(localManga);
            if (localId && !dbFavorites.some((dbManga) => getFavoriteId(dbManga) === localId)) {
              // Subimos a Supabase el local faltante
              await addFavoriteAction(localId, localManga);
              mergedList.push(localManga);
            }
          }

          // Actualizar store final
          set({ favorites: mergedList });
        } catch (err) {
          console.error("[useFavoritesStore] syncWithServer error:", err);
        }
      },

      reset: () => {
        set({ favorites: [] });
      },
    }),
    { name: "lectorfenix-favorites" }
  )
);

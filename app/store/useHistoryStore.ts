import { create } from "zustand";
import { persist } from "zustand/middleware";
import { addHistoryAction, removeHistoryAction, clearHistoryAction, getHistoryAction } from "../actions/history";
import { extractComicIdFromSlugId } from "../utils/slugify";

export type ReadingHistoryItem = {
  mangaId: string;
  mangaTitle: string;
  chapterId: string;
  chapterNumber: string;
  coverImage: string;
  timestamp: number;
};

type HistoryState = {
  history: ReadingHistoryItem[];
  addHistory: (item: ReadingHistoryItem) => Promise<void>;
  removeHistory: (mangaId: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  syncWithServer: () => Promise<void>;
  reset: () => void;
};

const MAX_HISTORY_ITEMS = 20;

const cleanId = (id: string) => {
  const cleaned = id.startsWith("lc-") ? id.substring(3) : id;
  return extractComicIdFromSlugId(cleaned);
};

const isNewerProgress = (local: ReadingHistoryItem, db: ReadingHistoryItem) => {
  const localNum = parseFloat(local.chapterNumber);
  const dbNum = parseFloat(db.chapterNumber);

  if (!isNaN(localNum) && !isNaN(dbNum)) {
    if (localNum !== dbNum) {
      return localNum > dbNum; // El número de capítulo más alto siempre es el más nuevo
    }
  }

  return local.timestamp > db.timestamp;
};

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      history: [],
      addHistory: async (item) => {
        if (!item.mangaId || !item.chapterId) {
          return;
        }

        // Reject phantom entries with the site-name fallback title
        const normalizedTitle = item.mangaTitle?.trim().toLowerCase();
        if (!normalizedTitle || normalizedTitle === "mangastoon") {
          return;
        }

        set((state) => {
          const itemCleanId = cleanId(item.mangaId);
          const withoutCurrentManga = state.history.filter(
            (historyItem) =>
              cleanId(historyItem.mangaId) !== itemCleanId &&
              historyItem.mangaTitle?.toLowerCase().trim() !== item.mangaTitle.toLowerCase().trim()
          );

          return {
            history: [item, ...withoutCurrentManga].slice(0, MAX_HISTORY_ITEMS),
          };
        });

        // Intentamos guardar en Supabase en segundo plano si está autenticado.
        // Si falla (por ejemplo por problemas de Next.js cookies durante navegación de cliente),
        // queda guardado localmente y se sincronizará luego mediante syncWithServer.
        try {
          await addHistoryAction(item);
        } catch (err) {
          console.error("[useHistoryStore] Failed to save history item to Supabase in background:", err);
        }
      },

      removeHistory: async (mangaId) => {
        const targetCleanId = cleanId(mangaId);
        // 1. Local update
        set((state) => ({
          history: state.history.filter((historyItem) => cleanId(historyItem.mangaId) !== targetCleanId),
        }));

        // 2. Sync to Supabase
        try {
          await removeHistoryAction(mangaId);
        } catch (err) {
          console.error("[useHistoryStore] Failed to remove reading history from Supabase:", err);
        }
      },

      clearHistory: async () => {
        // 1. Local update
        set({ history: [] });

        // 2. Sync to Supabase
        try {
          await clearHistoryAction();
        } catch (err) {
          console.error("[useHistoryStore] Failed to clear reading history from Supabase:", err);
        }
      },

      syncWithServer: async () => {
        // Asegurarse de que el store esté hidratado antes de sincronizar,
        // evitando pisar el localStorage con un estado vacío [].
        if (useHistoryStore.persist && !useHistoryStore.persist.hasHydrated()) {
          await new Promise<void>((resolve) => {
            const unsub = useHistoryStore.persist.onFinishHydration(() => {
              unsub();
              resolve();
            });
          });
        }

        try {
          const res = await getHistoryAction();
          if (!res || res.error) {
            // Keep local history if unauthenticated/errors
            return;
          }

          const dbHistory: ReadingHistoryItem[] = res.history || [];
          const localHistory = get().history;

          // Merge local and server history, normalizing lc- prefix:
          const mergedMap = new Map<string, ReadingHistoryItem>();

          // Seed with DB entries
          for (const dbItem of dbHistory) {
            mergedMap.set(cleanId(dbItem.mangaId), dbItem);
          }

          // Merge local entries and prepare non-blocking background uploads
          const itemsToUpload: ReadingHistoryItem[] = [];

          for (const localItem of localHistory) {
            const key = cleanId(localItem.mangaId);
            const existing = mergedMap.get(key);

            if (!existing) {
              itemsToUpload.push(localItem);
              mergedMap.set(key, localItem);
            } else if (isNewerProgress(localItem, existing)) {
              itemsToUpload.push(localItem);
              mergedMap.set(key, localItem);
            }
          }

          // Sort descending by timestamp and slice to MAX_HISTORY_ITEMS
          const mergedList = Array.from(mergedMap.values())
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, MAX_HISTORY_ITEMS);

          // Update client state immediately so the UI is reactive
          set({ history: mergedList });

          // Upload missing or updated history to Supabase asynchronously in background
          if (itemsToUpload.length > 0) {
            Promise.all(
              itemsToUpload.map((item) =>
                addHistoryAction(item).catch((err) =>
                  console.error("[useHistoryStore] Background sync failed for item:", item.mangaId, err)
                )
              )
            ).catch(() => {});
          }
        } catch (err) {
          console.error("[useHistoryStore] syncWithServer error:", err);
        }
      },

      reset: () => {
        set({ history: [] });
      },
    }),
    { name: "mangastoon-reading-history" }
  )
);


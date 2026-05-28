"use client";

import React, { useState } from "react";
import { Search, Loader2, Plus, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { addMangaToListAction } from "../../actions/lists";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface AddMangaSearchModalProps {
  listId: string;
  language: string;
}

export default function AddMangaSearchModal({ listId, language }: AddMangaSearchModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [addingId, setAddingId] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/mangadex/manga?title=${encodeURIComponent(query.trim())}&limit=6&includes[]=cover_art`);
      if (!res.ok) throw new Error("Search failed");
      const payload = await res.json();
      setResults(payload.data || []);
    } catch (err) {
      console.error(err);
      toast.error(language === "en" ? "Error searching manga" : language === "pt" ? "Erro ao buscar mangá" : "Error al buscar manga");
    } finally {
      setLoading(false);
    }
  };

  const handleAddManga = async (manga: any) => {
    setAddingId(manga.id);
    const title = manga.attributes?.title?.es || manga.attributes?.title?.en || Object.values(manga.attributes?.title || {})[0] || "Manga";
    const coverArt = manga.relationships?.find((r: any) => r.type === "cover_art");
    const fileName = coverArt?.attributes?.fileName;
    const coverUrl = fileName ? `https://uploads.mangadex.org/covers/${manga.id}/${fileName}` : null;

    try {
      const res = await addMangaToListAction(listId, manga.id, title, coverUrl);
      if (res.error) {
        toast.error(language === "en" ? "Could not add manga" : language === "pt" ? "Não foi possível adicionar o mangá" : "No se pudo agregar el manga");
      } else {
        toast.success(language === "en" ? "Manga added successfully" : language === "pt" ? "Mangá adicionado com sucesso" : "Manga agregado con éxito");
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      toast.error(language === "en" ? "Could not add manga" : language === "pt" ? "Não foi possível adicionar o mangá" : "No se pudo agregar el manga");
    } finally {
      setAddingId(null);
    }
  };

  const getMangaTitle = (manga: any) => {
    return manga.attributes?.title?.es || manga.attributes?.title?.en || Object.values(manga.attributes?.title || {})[0] || "Manga";
  };

  const getMangaCover = (manga: any) => {
    const coverArt = manga.relationships?.find((r: any) => r.type === "cover_art");
    const fileName = coverArt?.attributes?.fileName;
    return fileName ? `https://uploads.mangadex.org/covers/${manga.id}/${fileName}` : "/api/proxy-image?url=";
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 px-4 py-2.5 text-xs font-heading font-bold text-black transition-all active:scale-95 shadow-md shadow-orange-500/10 cursor-pointer"
      >
        <Plus size={14} className="stroke-[2.5]" />
        <span>{language === "en" ? "Add Manga" : language === "pt" ? "Adicionar Mangá" : "Agregar Manga"}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md"
            style={{ background: "rgba(0, 0, 0, 0.85)" }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="w-full max-w-lg rounded-3xl p-6 text-left relative overflow-hidden flex flex-col max-h-[85vh]"
              style={{
                background: "#131110",
                border: "1px solid rgba(255, 107, 0, 0.2)",
                boxShadow: "0 24px 50px rgba(0, 0, 0, 0.9)"
              }}
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                <h3 className="text-base font-bold text-gray-200">
                  {language === "en" ? "Add Manga to List" : language === "pt" ? "Adicionar Mangá à Lista" : "Agregar Manga a la Lista"}
                </h3>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setQuery("");
                    setResults([]);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-gray-400 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Buscador */}
              <form onSubmit={handleSearch} className="flex gap-2 mb-6">
                <div className="flex-1 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 focus-within:border-orange-500/50 transition-all">
                  <Search size={16} className="text-gray-500" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={language === "en" ? "Search by title..." : language === "pt" ? "Buscar por título..." : "Buscar por título..."}
                    className="flex-1 bg-transparent text-xs text-white outline-none placeholder:text-gray-600"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/50 px-5 text-xs font-bold text-black active:scale-95 transition-all flex items-center justify-center min-w-[80px]"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : (language === "en" ? "Search" : language === "pt" ? "Buscar" : "Buscar")}
                </button>
              </form>

              {/* Lista de Resultados */}
              <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 custom-scrollbar min-h-[250px]">
                {loading ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                    <Loader2 size={32} className="animate-spin text-orange-500 mb-2" />
                    <span className="text-xs">{language === "en" ? "Searching catalog..." : language === "pt" ? "Buscando catálogo..." : "Buscando catálogo..."}</span>
                  </div>
                ) : results.length > 0 ? (
                  results.map((manga) => {
                    const mId = manga.id;
                    const mTitle = getMangaTitle(manga);
                    const mCover = getMangaCover(manga);
                    const isAdding = addingId === mId;

                    return (
                      <div
                        key={mId}
                        className="flex items-center gap-3 p-2 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-colors"
                      >
                        <div className="h-14 w-10 shrink-0 overflow-hidden rounded bg-white/5 relative">
                          <img
                            src={mCover}
                            alt={mTitle}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-white truncate">{mTitle}</h4>
                          <p className="text-[10px] text-gray-500 mt-0.5 truncate">MangaDex</p>
                        </div>
                        <button
                          onClick={() => handleAddManga(manga)}
                          disabled={addingId !== null}
                          className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-[10px] font-bold text-orange-400 hover:bg-orange-500 hover:text-black transition-all disabled:opacity-40"
                        >
                          {isAdding ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            language === "en" ? "Add" : language === "pt" ? "Adicionar" : "Agregar"
                          )}
                        </button>
                      </div>
                    );
                  })
                ) : query && !loading ? (
                  <div className="flex-1 flex items-center justify-center text-gray-500 text-xs">
                    {language === "en" ? "No results found." : language === "pt" ? "Nenhum resultado encontrado." : "No se encontraron resultados."}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-600 text-xs text-center px-6 leading-relaxed">
                    {language === "en" 
                      ? "Search for manga by title and click add to insert them directly into this list." 
                      : language === "pt" 
                        ? "Busque mangás por título e clique em adicionar para inseri-los diretamente nesta lista." 
                        : "Busca mangas por título y haz clic en agregar para insertarlos directamente en esta lista."}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

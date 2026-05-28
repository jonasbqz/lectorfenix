"use client";

import { ThumbsUp, Lock, X } from "lucide-react";
import { useState, useOptimistic, useTransition } from "react";
import { toggleMangaLikeAction } from "../actions/likes";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import AuthModal from "./AuthModal";

type LikeButtonProps = {
  mangaId: string;
  initialLikesCount: number;
  initialUserHasLiked: boolean;
  apiLikesCount: number;
  userId: string | null;
  label?: string;
  likedLabel?: string;
};

export default function LikeButton({
  mangaId,
  initialLikesCount,
  initialUserHasLiked,
  apiLikesCount,
  userId,
  label = "Me gusta",
  likedLabel = "Te gusta",
}: LikeButtonProps) {
  const [state, setState] = useState({
    liked: initialUserHasLiked,
    count: initialLikesCount,
  });

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [optimisticState, setOptimisticState] = useOptimistic(
    state,
    (currentState, action: "toggle") => {
      const nextLiked = !currentState.liked;
      const nextCount = nextLiked
        ? currentState.count + 1
        : Math.max(0, currentState.count - 1);
      return {
        liked: nextLiked,
        count: nextCount,
      };
    }
  );

  // Logic: Show Supabase real likes if >= 100. Otherwise show the API votes count (adjusted optimistically).
  const isDisplayingRealCount = optimisticState.count >= 100;
  const displayedCount = isDisplayingRealCount
    ? optimisticState.count
    : (optimisticState.liked && !initialUserHasLiked
        ? apiLikesCount + 1
        : (!optimisticState.liked && initialUserHasLiked
            ? Math.max(0, apiLikesCount - 1)
            : apiLikesCount
          )
      );

  const handleLikeToggle = async () => {
    if (!userId) {
      setShowAuthModal(true);
      return;
    }

    startTransition(async () => {
      // Optimistic update
      setOptimisticState("toggle");

      try {
        const result = await toggleMangaLikeAction(mangaId);

        if (result.error) {
          if (result.error === "unauthenticated") {
            setShowAuthModal(true);
          } else {
            toast.error("Error al registrar tu valoración.");
          }
          return;
        }

        // Update real state from database response
        setState((current) => {
          const liked = result.liked ?? false;
          const count = liked ? current.count + 1 : Math.max(0, current.count - 1);
          return { liked, count };
        });

        if (result.liked) {
          toast.success("¡Te gusta este manga!");
        } else {
          toast.success("Valoración eliminada");
        }
      } catch {
        toast.error("Ocurrió un error inesperado.");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleLikeToggle}
        disabled={isPending}
        className={`flex w-full items-center justify-center gap-2.5 rounded-xl border py-3 text-sm font-bold transition-all duration-300 active:scale-95
          ${
            optimisticState.liked
              ? "border-[#00e700]/30 bg-[#00e700] text-black shadow-[0_0_15px_rgba(0,231,0,0.25)] hover:bg-[#00d000]"
              : "border-white/5 bg-white/[0.03] text-gray-300 hover:border-white/10 hover:bg-white/[0.06] hover:text-white"
          }`}
      >
        <ThumbsUp className={`h-4.5 w-4.5 ${optimisticState.liked ? "fill-black" : ""}`} />
        <span>
          {optimisticState.liked ? likedLabel : label} ({displayedCount.toLocaleString()})
        </span>
      </button>

      {/* Auth Prompt Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAuthModal(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-md"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 15 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="relative w-full max-w-sm overflow-hidden rounded-2xl p-6 shadow-2xl"
              style={{
                background: "#131110",
                border: "1px solid rgba(247,242,232,0.10)",
                boxShadow: "0 24px 48px rgba(0,0,0,0.6)",
              }}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="absolute right-4 top-4 text-gray-500 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="flex flex-col items-center text-center">
                {/* Lock Icon */}
                <div 
                  className="flex h-12 w-12 items-center justify-center rounded-xl mb-4"
                  style={{ background: "rgba(255, 107, 0, 0.08)", border: "1px solid rgba(255, 107, 0, 0.18)", color: "#ff6b00" }}
                >
                  <Lock size={22} />
                </div>

                <h3 className="text-lg font-bold text-gray-100">Inicia sesión para valorar</h3>
                <p className="mt-2 text-xs leading-relaxed text-gray-400">
                  Para dar me gusta a tus mangas favoritos y guardarlos en la nube, necesitas estar registrado en MangaStoon.
                </p>

                <div className="mt-6 flex w-full flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAuthModal(false);
                      setIsAuthModalOpen(true);
                    }}
                    className="w-full rounded-xl py-3 text-xs font-bold transition-all cursor-pointer"
                    style={{
                      background: "linear-gradient(135deg, #ff6b00, #ff8833)",
                      color: "#000000",
                      boxShadow: "0 4px 20px rgba(255, 107, 0, 0.22)",
                    }}
                  >
                    Registrarme / Iniciar sesión
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAuthModal(false)}
                    className="w-full rounded-xl border py-3 text-xs font-bold transition-all cursor-pointer"
                    style={{
                      borderColor: "rgba(247,242,232,0.10)",
                      background: "rgba(247,242,232,0.02)",
                      color: "#f7f2e8"
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(247,242,232,0.06)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(247,242,232,0.02)"; }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AuthModal
        open={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </>
  );
}

"use client";

import { ThumbsUp, Lock, X } from "lucide-react";
import { useState, useOptimistic, useTransition } from "react";
import { toggleMangaLikeAction } from "../actions/likes";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import AuthModal from "./AuthModal";

function formatCountCompact(num: number) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return num.toString();
}

type LikeButtonProps = {
  mangaId: string;
  initialLikesCount: number;
  initialUserHasLiked: boolean;
  apiLikesCount: number;
  userId: string | null;
  label?: string;
  likedLabel?: string;
  variant?: "inline" | "compact";
};

export default function LikeButton({
  mangaId,
  initialLikesCount,
  initialUserHasLiked,
  apiLikesCount,
  userId,
  label = "Me gusta",
  likedLabel = "Te gusta",
  variant = "inline",
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

  if (variant === "compact") {
    return (
      <>
        <button
          type="button"
          onClick={handleLikeToggle}
          disabled={isPending}
          className={`flex items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-bold transition-all active:scale-95 cursor-pointer shrink-0 w-full
            ${
              optimisticState.liked
                ? "border-[#00e700]/30 bg-[#00e700]/10 text-[#00e700] hover:bg-[#00e700]/20"
                : "border-white/10 bg-white/5 text-gray-300 hover:text-white hover:border-white/20"
            }`}
        >
          <ThumbsUp className={`h-3.5 w-3.5 shrink-0 ${optimisticState.liked ? "fill-current" : ""}`} />
          <span className="hidden md:inline shrink-0">
            {optimisticState.liked ? likedLabel : label} ({formatCountCompact(displayedCount)})
          </span>
          <span className="md:hidden inline text-xs shrink-0">
            {formatCountCompact(displayedCount)}
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

  return (
    <>
      <button
        type="button"
        onClick={handleLikeToggle}
        disabled={isPending}
        className={`flex items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-semibold w-full transition-all duration-300 active:scale-95
          ${
            optimisticState.liked
              ? "border-[#00e700]/30 bg-[#00e700]/10 text-[#00e700] hover:bg-[#00e700]/20"
              : "border-white/10 bg-white/5 text-gray-300 hover:text-white hover:border-white/20 hover:bg-white/10"
          }`}
      >
        <ThumbsUp className={`h-4 w-4 shrink-0 ${optimisticState.liked ? "fill-current" : ""}`} />
        <span className="text-xs font-bold shrink-0">
          {formatCountCompact(displayedCount)}
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

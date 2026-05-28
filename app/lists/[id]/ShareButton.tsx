"use client";

import React from "react";
import { Share2 } from "lucide-react";
import { toast } from "sonner";

interface ShareButtonProps {
  listId: string;
  language: "es" | "en" | "pt";
}

export default function ShareButton({ listId, language }: ShareButtonProps) {
  const handleShare = () => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/lists/${listId}`;
    navigator.clipboard.writeText(url);
    
    const msg = 
      language === "es" 
        ? "¡Enlace de lista copiado al portapapeles! 📋" 
        : language === "pt" 
          ? "Link da lista copiado! 📋" 
          : "List link copied to clipboard! 📋";
          
    toast.success(msg);
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500/10 border border-orange-500/20 px-4 py-2.5 text-xs font-heading font-bold text-orange-500 hover:bg-orange-500 hover:text-black transition-all active:scale-95 shadow-md shadow-orange-500/5"
    >
      <Share2 size={14} />
      <span>
        {language === "es" ? "Compartir Lista" : language === "pt" ? "Compartilhar Lista" : "Share List"}
      </span>
    </button>
  );
}

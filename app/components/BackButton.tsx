"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLanguage } from "./language-provider";

const BACK_LABELS = {
  es: "Volver",
  en: "Back",
  pt: "Voltar",
} as const;

export default function BackButton({
  label,
  fixed = false,
  fallbackHref = "/",
}: {
  label?: string;
  fixed?: boolean;
  fallbackHref?: string;
}) {
  const { language } = useLanguage();
  const router = useRouter();
  const displayLabel = label ?? BACK_LABELS[language];

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };

  return (
    <div className={fixed ? "fixed left-6 top-6 z-50" : "mb-8"}>
      <button
        onClick={handleBack}
        className="group inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#ff6b00]/25 bg-[#ff6b00]/10 px-4 py-2 text-sm font-heading font-bold text-[#ff6b00] backdrop-blur transition-all hover:border-[#ff6b00]/50 hover:bg-[#ff6b00] hover:text-black shadow-md shadow-orange-500/5"
      >
        <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
        {displayLabel}
      </button>
    </div>
  );
}

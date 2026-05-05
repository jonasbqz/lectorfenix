"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function BackButton({
  label = "Volver",
  fixed = false,
}: {
  label?: string;
  fixed?: boolean;
}) {
  const router = useRouter();

  return (
    <div className={fixed ? "fixed left-6 top-6 z-50" : "mb-8"}>
      <button
        type="button"
        onClick={() => router.back()}
        className="group flex cursor-pointer items-center gap-2 rounded-full border border-neutral-700 bg-neutral-900/80 px-4 py-2 text-sm font-medium text-white backdrop-blur transition-colors hover:text-orange-500"
      >
        <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
        {label}
      </button>
    </div>
  );
}

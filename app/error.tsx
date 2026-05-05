"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4 text-white">
      <section className="relative w-full max-w-xl overflow-hidden rounded-[32px] border border-white/10 bg-[#141519] p-8 text-center shadow-2xl shadow-black/50">
        <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 rounded-full bg-orange-500/15 blur-3xl" />
        <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-500">
          <AlertTriangle className="h-9 w-9" />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.35em] text-orange-500">
          Algo salio mal
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-white">
          MangaDex esta respirando fuerte
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-gray-400">
          No pudimos cargar esta vista ahora mismo. Puede ser una caida temporal de la API o una respuesta incompleta.
        </p>
        {error.digest ? (
          <p className="mt-4 text-xs text-gray-600">Codigo: {error.digest}</p>
        ) : null}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-orange-500 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-orange-600"
          >
            <RefreshCw className="h-4 w-4" />
            Intentar otra vez
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-gray-200 transition-colors hover:border-orange-500/40 hover:text-orange-500"
          >
            Volver al inicio
          </Link>
        </div>
      </section>
    </main>
  );
}

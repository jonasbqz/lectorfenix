import Link from 'next/link';
import { Home, AlertTriangle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      {/* Contenedor del Error */}
      <div className="relative mb-8">
        <h1 className="text-[120px] md:text-[180px] font-black text-transparent bg-clip-text bg-gradient-to-b from-orange-500 to-orange-500/20 leading-none select-none">
          404
        </h1>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white drop-shadow-[0_0_15px_rgba(0,0,0,0.8)]">
          <AlertTriangle size={64} className="text-orange-400 opacity-80" />
        </div>
      </div>

      {/* Textos */}
      <h2 className="text-2xl md:text-4xl font-bold text-white mb-4 tracking-tight">
        ¡Ups! Te saliste de la viñeta.
      </h2>
      <p className="text-gray-400 md:text-lg max-w-md mx-auto mb-10">
        Parece que el manga o la página que buscas fue reencarnado en otro mundo (Isekai) o simplemente no existe.
      </p>

      {/* Botón de regreso */}
      <Link
        href="/"
        className="group relative inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base font-bold text-white bg-orange-500 rounded-full overflow-hidden transition-all hover:scale-105 hover:bg-orange-600 shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_30px_rgba(249,115,22,0.5)]"
      >
        <Home size={20} className="group-hover:-translate-y-1 transition-transform" />
        <span>Volver al Inicio</span>
      </Link>
    </div>
  );
}

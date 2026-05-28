import Link from 'next/link';

export default function BrandLogo() {
  return (
    <Link href="/" className="flex min-w-0 items-center gap-2 group cursor-pointer">
      {/* Isotipo: La "M" ahora es más robusta y proporcionada al texto */}
      <svg
        viewBox="0 0 100 100"
        className="h-7 w-7 shrink-0 text-orange-500 drop-shadow-[0_0_10px_rgba(249,115,22,0.4)] transition-transform duration-300 group-hover:scale-105 md:h-8 md:w-8"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Trazos más gruesos para igualar el font-black del texto */}
        <path d="M10 85 V20 L35 55 L50 35 L65 55 L90 20 V85 H70 V45 L50 75 L30 45 V85 Z" />
      </svg>

      {/* Logotipo: Ligeramente más separado para respirar mejor */}
      <span className="hidden md:inline truncate text-sm font-black tracking-tight text-white sm:text-base md:text-lg">
        MANGA<span className="text-orange-500">STOON</span>
      </span>
    </Link>
  );
}

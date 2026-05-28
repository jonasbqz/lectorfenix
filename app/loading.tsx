import MangaLoader from "./components/MangaLoader";
import { MangaCardSkeleton } from "./components/MangaCard";

export default function Loading() {
  return (
    <div className="relative min-h-[70vh] w-full">
      {/* Blurred background skeletons to mimic X/Facebook visual style */}
      <div className="pointer-events-none mx-auto max-w-[1600px] px-4 py-8 opacity-25 blur-xs md:px-8">
        <div className="mb-6 h-8 w-48 rounded bg-white/10" />
        <div className="flex gap-4 overflow-x-hidden pb-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <MangaCardSkeleton key={`home-skeleton-${index}`} variant="carousel" />
          ))}
        </div>
        <div className="mt-12 h-6 w-36 rounded bg-white/10" />
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
          {Array.from({ length: 14 }).map((_, index) => (
            <MangaCardSkeleton key={`home-grid-skeleton-${index}`} variant="grid" />
          ))}
        </div>
      </div>

      {/* Centered Manga/Anime loader overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <MangaLoader />
      </div>
    </div>
  );
}

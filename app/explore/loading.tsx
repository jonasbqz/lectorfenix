export default function ExploreLoadingPage() {
  return (
    <main className="min-h-screen bg-[#141519] px-8 pb-16 pt-24 text-white">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-8 h-10 w-72 animate-pulse rounded bg-white/5" />

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
          {Array.from({ length: 10 }).map((_, index) => (
            <div
              key={`explore-skeleton-${index}`}
              className="aspect-[2/3] animate-pulse rounded-md bg-white/5"
            />
          ))}
        </div>
      </div>
    </main>
  );
}

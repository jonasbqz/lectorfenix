export default function Loading() {
  return (
    <div className="mx-auto max-w-[1600px] animate-pulse px-4 py-8 md:px-8">
      <div className="mb-6 h-8 w-48 rounded bg-[#16171d]" />
      <div className="flex gap-4 overflow-x-hidden pb-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex w-[150px] shrink-0 flex-col md:w-[200px]">
            <div className="aspect-[2/3] w-full rounded-lg bg-[#16171d]" />
            <div className="mt-3 h-4 w-3/4 rounded bg-[#16171d]" />
            <div className="mt-2 h-3 w-1/2 rounded bg-[#16171d]" />
          </div>
        ))}
      </div>
    </div>
  );
}

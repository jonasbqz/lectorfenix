"use client";

import { useState } from "react";

export default function SynopsisBlock({
  title,
  content,
  expandLabel,
  collapseLabel,
}: {
  title: string;
  content: string;
  expandLabel: string;
  collapseLabel: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLong = content.length > 280;

  return (
    <section className="mt-6 rounded-xl bg-[#141519] p-5 text-center sm:p-6 md:text-left">
      <div className="mb-4 inline-flex items-center justify-center gap-3 md:justify-start">
        <span className="h-6 w-1.5 rounded-full bg-[#ff6b00]" />
        <h2 className="text-2xl font-semibold text-white">{title}</h2>
      </div>
      <div className="mt-4">
        <p className={`text-base leading-[1.65] text-gray-300 ${!expanded && isLong ? "line-clamp-3" : ""}`}>
          {content}
        </p>

        {isLong ? (
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="mt-4 text-sm font-semibold text-[#ff6b00] transition-colors hover:text-orange-300"
          >
            {expanded ? collapseLabel : expandLabel}
          </button>
        ) : null}
      </div>
    </section>
  );
}

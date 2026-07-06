"use client";

import type { Genre } from "@/lib/types";

const genres: { value: Genre | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "fantasy", label: "Fantasy" },
  { value: "scifi", label: "Sci-Fi" },
  { value: "mythology", label: "Mythology" },
  { value: "cyberpunk", label: "Cyberpunk" },
  { value: "horror", label: "Horror" },
  { value: "adventure", label: "Adventure" },
];

export function GenreFilter({
  active,
  onChange,
}: {
  active: Genre | "all";
  onChange: (genre: Genre | "all") => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {genres.map((g) => (
        <button
          key={g.value}
          onClick={() => onChange(g.value)}
          className={`px-4 py-1.5 rounded-full text-xs font-sans font-semibold uppercase tracking-wider transition-all duration-200 ${
            active === g.value
              ? "bg-grimoire-purple/20 text-grimoire-purple-light border border-grimoire-purple/40"
              : "bg-grimoire-surface/50 text-grimoire-muted border border-grimoire-border/50 hover:text-grimoire-ink hover:border-grimoire-border"
          }`}
        >
          {g.label}
        </button>
      ))}
    </div>
  );
}

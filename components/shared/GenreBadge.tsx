import type { Genre } from "@/lib/types";

const genreConfig: Record<Genre, { label: string; className: string }> = {
  fantasy: { label: "Fantasy", className: "genre-fantasy" },
  scifi: { label: "Sci-Fi", className: "genre-scifi" },
  mythology: { label: "Mythology", className: "genre-mythology" },
  cyberpunk: { label: "Cyberpunk", className: "genre-cyberpunk" },
  horror: { label: "Horror", className: "genre-horror" },
  adventure: { label: "Adventure", className: "genre-adventure" },
};

export function GenreBadge({ genre, size = "sm" }: { genre: Genre; size?: "sm" | "md" }) {
  const config = genreConfig[genre];
  const sizeClasses = size === "md" ? "px-3 py-1 text-xs" : "px-2 py-0.5 text-[10px]";

  return (
    <span className={`${config.className} rounded-full font-sans font-semibold uppercase tracking-wider ${sizeClasses}`}>
      {config.label}
    </span>
  );
}

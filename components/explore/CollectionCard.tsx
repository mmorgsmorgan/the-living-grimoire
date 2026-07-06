"use client";

import Link from "next/link";
import type { Collection } from "@/lib/types";
import { GenreBadge } from "@/components/shared/GenreBadge";
import { StoryProgress } from "@/components/shared/StoryProgress";

export function CollectionCard({ collection }: { collection: Collection }) {
  const { id, name, description, genre, coverHue, world, status } = collection;
  const altHue = (coverHue + 45) % 360;
  const chapterCount = world?.chapters.length ?? 0;
  const characterCount = world?.characters.length ?? 0;
  const locationCount = world?.locations.length ?? 0;

  return (
    <Link href={`/collection/${id}`} className="block">
      <div className="grimoire-card group cursor-pointer h-full flex flex-col">
        {/* Cover gradient */}
        <div
          className="aspect-[16/10] w-full relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, hsl(${coverHue},50%,15%), hsl(${altHue},40%,10%))` }}
        >
          {/* Decorative elements */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="w-20 h-20 border border-white/10 rounded-full rotate-45 group-hover:rotate-90 transition-transform duration-700"
              style={{ borderColor: `hsla(${coverHue},60%,50%,0.3)` }}
            />
            <div
              className="absolute w-12 h-12 border border-dashed border-white/5 rounded-lg rotate-12 group-hover:-rotate-12 transition-transform duration-500"
            />
          </div>

          {/* Title overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-grimoire-bg/90 to-transparent">
            <h3 className="font-display text-white text-base leading-tight">{name}</h3>
          </div>

          {/* Status badge */}
          {status === "generating" && (
            <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-grimoire-purple/20 border border-grimoire-purple/30 text-grimoire-purple-light text-[10px] font-mono animate-pulse">
              Generating…
            </div>
          )}

          {/* Genre badge */}
          <div className="absolute top-3 left-3">
            <GenreBadge genre={genre} />
          </div>
        </div>

        {/* Card body */}
        <div className="p-4 flex-1 flex flex-col">
          <p className="text-grimoire-muted text-xs leading-relaxed line-clamp-2 mb-3 font-sans">
            {description || "A living world waiting to be explored…"}
          </p>

          {/* Stats row */}
          {world && (
            <div className="flex items-center gap-3 text-[10px] font-mono text-grimoire-muted mb-3">
              <span>{characterCount} characters</span>
              <span className="text-grimoire-border">·</span>
              <span>{locationCount} locations</span>
              <span className="text-grimoire-border">·</span>
              <span>{chapterCount} chapters</span>
            </div>
          )}

          {/* Story progress */}
          {world && chapterCount > 0 && (
            <div className="mt-auto">
              <StoryProgress current={chapterCount} total={chapterCount} />
            </div>
          )}

          {!world && (
            <div className="mt-auto">
              <span className="text-[10px] font-mono text-grimoire-muted/50">No story generated yet</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

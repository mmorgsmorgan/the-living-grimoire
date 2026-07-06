"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { useGrimoireStore } from "@/lib/store";

export default function StoryReaderPage() {
  const params = useParams();
  const id = params?.id as string;
  const { collections, hydrate, isHydrated } = useGrimoireStore();
  const [currentChapter, setCurrentChapter] = useState(0);
  const [showSidebar, setShowSidebar] = useState(false);

  useEffect(() => {
    if (!isHydrated) hydrate();
  }, [hydrate, isHydrated]);

  const collection = collections.find((c) => c.id === id);
  const world = collection?.world;
  const chapters = world?.chapters ?? [];
  const chapter = chapters[currentChapter];

  if (!isHydrated) {
    return (
      <main className="min-h-screen grimoire-mesh">
        <Navbar />
        <div className="pt-32 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-grimoire-purple border-t-transparent rounded-full animate-spin" />
        </div>
      </main>
    );
  }

  if (!collection || !world || chapters.length === 0) {
    return (
      <main className="min-h-screen flex flex-col grimoire-mesh">
        <Navbar />
        <div className="pt-32 flex-1 flex flex-col items-center justify-center text-center px-4">
          <div className="text-5xl mb-4">📖</div>
          <h1 className="font-display text-white text-2xl mb-2">No Story Available</h1>
          <p className="text-grimoire-muted text-sm mb-6 font-sans">This collection doesn&apos;t have any story chapters yet.</p>
          <Link href="/explore" className="btn-primary">Browse Worlds</Link>
        </div>
      </main>
    );
  }

  const featuredChars = world.characters.filter((c) =>
    chapter?.characterIds.includes(c.id)
  );
  const location = world.locations.find((l) => l.id === chapter?.locationId);
  const progress = ((currentChapter + 1) / chapters.length) * 100;

  return (
    <main className="min-h-screen grimoire-mesh">
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-grimoire-bg/95 backdrop-blur-md border-b border-grimoire-border">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href={`/collection/${id}`}
            className="text-sm text-grimoire-muted hover:text-grimoire-gold transition-colors font-sans flex items-center gap-2"
          >
            ← Back to {collection.name}
          </Link>

          <div className="flex items-center gap-4">
            <span className="text-xs font-mono text-grimoire-muted">
              Ch. {currentChapter + 1}/{chapters.length}
            </span>
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 text-grimoire-muted hover:text-grimoire-purple-light transition-colors"
              aria-label="Toggle chapter list"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                <rect x="2" y="3" width="14" height="1.5" rx="0.75" />
                <rect x="2" y="8" width="10" height="1.5" rx="0.75" />
                <rect x="2" y="13" width="14" height="1.5" rx="0.75" />
              </svg>
            </button>
          </div>
        </div>
        {/* Reading progress */}
        <div className="h-0.5 bg-grimoire-surface">
          <div
            className="h-full bg-gradient-to-r from-grimoire-purple to-grimoire-gold transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Chapter sidebar */}
      {showSidebar && (
        <div className="fixed inset-0 z-40 flex">
          <div
            className="flex-1 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSidebar(false)}
          />
          <div className="w-72 bg-grimoire-elevated border-l border-grimoire-border p-5 overflow-y-auto">
            <h3 className="font-display text-grimoire-gold text-sm mb-4">Chapters</h3>
            <div className="space-y-1">
              {chapters.map((ch, i) => (
                <button
                  key={ch.id}
                  onClick={() => { setCurrentChapter(i); setShowSidebar(false); }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-sans transition-colors flex items-center gap-3 ${
                    i === currentChapter
                      ? "bg-grimoire-purple/10 text-grimoire-purple-light"
                      : "text-grimoire-muted hover:text-grimoire-ink hover:bg-grimoire-surface/50"
                  }`}
                >
                  <span className="text-[10px] font-mono w-5 shrink-0">{ch.number}</span>
                  <span className="truncate">{ch.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main reading area */}
      <div className="pt-20 pb-24 px-4">
        <article className="max-w-2xl mx-auto animate-fade-in" key={chapter?.id}>
          {/* Chapter header */}
          <div className="text-center mb-12">
            <p className="text-grimoire-purple-light text-xs font-mono uppercase tracking-widest mb-3">
              Chapter {chapter?.number}
            </p>
            <h1 className="font-display text-white text-3xl sm:text-4xl mb-4">
              {chapter?.title}
            </h1>

            {/* Location tag */}
            {location && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-grimoire-surface/50 border border-grimoire-border text-grimoire-teal text-xs font-sans">
                🗺️ {location.name}
              </div>
            )}
          </div>

          {/* Chapter content */}
          <div className="prose-grimoire">
            {chapter?.content.split("\n\n").map((paragraph, i) => (
              <p
                key={i}
                className="text-grimoire-ink font-body text-lg leading-[2] mb-6 animate-fade-in"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                {paragraph}
              </p>
            ))}
          </div>

          {/* Featured characters */}
          {featuredChars.length > 0 && (
            <div className="mt-12 pt-8 border-t border-grimoire-border/50">
              <p className="text-xs text-grimoire-muted uppercase tracking-wider font-sans mb-4">
                Characters in this chapter
              </p>
              <div className="flex flex-wrap gap-3">
                {featuredChars.map((char) => (
                  <div key={char.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-grimoire-surface/50 border border-grimoire-border">
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-display text-white/80"
                      style={{ background: `linear-gradient(135deg, hsl(${char.imageHue},50%,20%), hsl(${(char.imageHue + 40) % 360},40%,15%))` }}
                    >
                      {char.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-sans text-grimoire-ink">{char.name}</p>
                      <p className="text-[9px] font-sans text-grimoire-muted">{char.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-12 pt-8 border-t border-grimoire-border/50">
            <button
              onClick={() => setCurrentChapter(Math.max(0, currentChapter - 1))}
              disabled={currentChapter === 0}
              className="btn-secondary px-5 py-2.5 text-xs disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Previous Chapter
            </button>

            {currentChapter < chapters.length - 1 ? (
              <button
                onClick={() => setCurrentChapter(currentChapter + 1)}
                className="btn-primary px-5 py-2.5 text-xs"
              >
                Next Chapter →
              </button>
            ) : (
              <Link href={`/collection/${id}`} className="btn-primary px-5 py-2.5 text-xs">
                Back to World ✦
              </Link>
            )}
          </div>
        </article>
      </div>
    </main>
  );
}

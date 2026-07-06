"use client";

import { useEffect, useMemo } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CollectionCard } from "@/components/explore/CollectionCard";
import { GenreFilter } from "@/components/explore/GenreFilter";
import { useGrimoireStore } from "@/lib/store";
import Link from "next/link";

export default function ExplorePage() {
  const {
    collections,
    hydrate,
    isHydrated,
    genreFilter,
    searchQuery,
    setGenreFilter,
    setSearchQuery,
  } = useGrimoireStore();

  useEffect(() => {
    if (!isHydrated) hydrate();
  }, [hydrate, isHydrated]);

  const filtered = useMemo(() => {
    return collections
      .filter((c) => c.status === "published")
      .filter((c) => genreFilter === "all" || c.genre === genreFilter)
      .filter((c) =>
        searchQuery === "" ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [collections, genreFilter, searchQuery]);

  return (
    <main className="min-h-screen flex flex-col grimoire-mesh">
      <Navbar />

      <div className="pt-16 flex-1">
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-24">
          {/* Header */}
          <div className="mb-10">
            <p className="text-xs text-grimoire-purple-light uppercase tracking-widest font-mono mb-2">
              Discover
            </p>
            <h1 className="font-display text-white text-3xl sm:text-4xl mb-4">
              Explore Living Worlds
            </h1>
            <p className="text-grimoire-muted text-base font-sans max-w-2xl">
              Browse NFT collections that have been transformed into interactive story worlds with AI-generated lore, characters, and narratives.
            </p>
          </div>

          {/* Search + Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1 max-w-md">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grimoire-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search collections…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-grimoire-elevated border border-grimoire-border rounded-xl text-sm text-grimoire-ink placeholder-grimoire-muted font-sans focus:outline-none focus:border-grimoire-purple/50 transition-colors"
              />
            </div>
          </div>

          <div className="mb-8">
            <GenreFilter active={genreFilter} onChange={setGenreFilter} />
          </div>

          {/* Grid */}
          {filtered.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map((collection) => (
                <CollectionCard key={collection.id} collection={collection} />
              ))}
            </div>
          ) : (
            <div className="py-24 flex flex-col items-center justify-center text-center border border-dashed border-grimoire-border rounded-2xl">
              <div className="w-16 h-16 rounded-full bg-grimoire-purple/5 border border-grimoire-purple/20 flex items-center justify-center mb-4 text-3xl">
                📖
              </div>
              <p className="text-grimoire-ink font-sans text-base mb-1">No worlds found</p>
              <p className="text-grimoire-muted font-sans text-sm mb-6">
                {searchQuery || genreFilter !== "all"
                  ? "Try adjusting your search or filters."
                  : "Create your first Living World to get started."}
              </p>
              <Link href="/create" className="btn-primary inline-flex items-center gap-2">
                Create a World <span>✦</span>
              </Link>
            </div>
          )}
        </section>
      </div>

      <Footer />
    </main>
  );
}

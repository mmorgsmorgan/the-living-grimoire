"use client";

import { useEffect, useState, useMemo } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { fetchAllWorlds, type WorldSummary } from "@/lib/api";
import { resolveIPFSGateway, raceIPFSFetchJSON } from "@/lib/pinata";
import { usePublicClient } from "wagmi";
import Link from "next/link";

const BASE_URI_ABI = [
  { inputs: [], name: "baseURI", outputs: [{ name: "", type: "string" }], stateMutability: "view", type: "function" },
] as const;

function WorldCard({ world }: { world: WorldSummary }) {
  const [coverImage, setCoverImage] = useState<string>("");
  const [imgError, setImgError] = useState(false);
  const publicClient = usePublicClient();

  useEffect(() => {
    async function fetchCover() {
      // 1. Try localStorage cache first (saved at deploy time)
      try {
        const saved = localStorage.getItem(`grimoire_meta_${world.contract.toLowerCase()}`);
        if (saved) {
          const meta = JSON.parse(saved);
          if (meta.image) {
            setCoverImage(resolveIPFSGateway(meta.image));
            return;
          }
        }
      } catch {}

      // 2. Read baseURI from on-chain
      if (!publicClient) return;
      try {
        const baseURI = await publicClient.readContract({
          address: world.contract as `0x${string}`,
          abi: BASE_URI_ABI,
          functionName: "baseURI",
        });
        if (!baseURI) return;

        // Single-image: baseURI is the image CID itself (no trailing slash)
        if (!baseURI.endsWith("/")) {
          setCoverImage(resolveIPFSGateway(baseURI));
          return;
        }
        // Multi-image: fetch token 0 or 1 metadata
        const cover = await raceIPFSFetchJSON(baseURI + "0");
        if (cover?.image) { setCoverImage(resolveIPFSGateway(cover.image)); return; }
        const token1 = await raceIPFSFetchJSON(baseURI + "1");
        if (token1?.image) { setCoverImage(resolveIPFSGateway(token1.image)); }
      } catch {}
    }
    fetchCover();
  }, [world.contract, publicClient]);

  return (
    <div className="story-panel hover:border-grimoire-purple/40 transition-all group overflow-hidden flex flex-col">
      {/* Large artwork — the hero of the card */}
      <Link href={`/collection/${world.contract}`} className="block">
        <div className="w-full aspect-square overflow-hidden relative">
          {coverImage && !imgError ? (
            <img
              src={coverImage}
              alt={world.worldName || world.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-grimoire-purple/15 to-grimoire-gold/10 flex items-center justify-center">
              <span className="font-display text-grimoire-purple-light/30 text-6xl group-hover:text-grimoire-purple-light/50 transition-colors">
                {world.worldName?.charAt(0) || world.name?.charAt(0) || "?"}
              </span>
            </div>
          )}

          {/* Genre / tone badges float on the image */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            {world.genre && (
              <span className="px-2.5 py-1 bg-grimoire-bg/70 backdrop-blur-sm text-grimoire-purple-light text-[10px] font-mono rounded-full border border-grimoire-purple/20">
                {world.genre}
              </span>
            )}
            {world.tone && (
              <span className="px-2.5 py-1 bg-grimoire-bg/70 backdrop-blur-sm text-grimoire-gold text-[10px] font-mono rounded-full border border-grimoire-gold/20">
                {world.tone}
              </span>
            )}
          </div>

          {/* Title over a gradient scrim */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-grimoire-bg via-grimoire-bg/60 to-transparent">
            <h3 className="font-display text-white text-lg leading-tight truncate">
              {world.worldName || world.name}
            </h3>
            {world.tagline && (
              <p className="text-grimoire-muted text-xs font-sans line-clamp-1 mt-0.5">{world.tagline}</p>
            )}
          </div>
        </div>
      </Link>

      {/* Prominent actions */}
      <div className="p-3 grid grid-cols-2 gap-2">
        <Link
          href={`/mint/${world.contract}`}
          className="btn-primary text-center py-2.5 text-xs font-bold tracking-wider"
        >
          MINT
        </Link>
        <Link
          href={`/collection/${world.contract}`}
          className="text-center py-2.5 text-xs font-bold tracking-wider rounded-xl border border-grimoire-border text-grimoire-muted hover:text-grimoire-gold hover:border-grimoire-gold/40 transition-colors"
        >
          ENTER WORLD
        </Link>
      </div>
    </div>
  );
}

export default function ExplorePage() {
  const [worlds, setWorlds] = useState<WorldSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [genreFilter, setGenreFilter] = useState("all");

  useEffect(() => {
    fetchAllWorlds()
      .then((data) => setWorlds(data.worlds))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return worlds
      .filter((w) => genreFilter === "all" || w.genre === genreFilter)
      .filter(
        (w) =>
          searchQuery === "" ||
          w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          w.worldName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [worlds, genreFilter, searchQuery]);

  const genres = ["all", "fantasy", "sci-fi", "horror", "mystery", "mythology"];

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
                placeholder="Search collections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-grimoire-elevated border border-grimoire-border rounded-xl text-sm text-white placeholder-grimoire-muted font-sans focus:outline-none focus:border-grimoire-purple/50 transition-colors"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-8">
            {genres.map((g) => (
              <button
                key={g}
                onClick={() => setGenreFilter(g)}
                className={`px-4 py-1.5 rounded-full text-xs font-mono transition-colors ${
                  genreFilter === g
                    ? "bg-grimoire-purple/20 text-grimoire-purple-light border border-grimoire-purple/40"
                    : "bg-grimoire-surface text-grimoire-muted border border-grimoire-border hover:border-grimoire-purple/30"
                }`}
              >
                {g === "all" ? "All" : g.charAt(0).toUpperCase() + g.slice(1)}
              </button>
            ))}
          </div>

          {/* Grid */}
          {loading ? (
            <div className="py-24 text-center">
              <p className="text-grimoire-muted text-sm font-mono animate-pulse">Loading worlds...</p>
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map((world) => (
                <WorldCard key={world.id} world={world} />
              ))}
            </div>
          ) : (
            <div className="py-24 flex flex-col items-center justify-center text-center border border-dashed border-grimoire-border rounded-2xl">
              <div className="w-16 h-16 mb-4 rounded-2xl overflow-hidden border border-grimoire-border shadow-glow-purple flex items-center justify-center bg-grimoire-surface">
                <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
              </div>
              <p className="text-white font-sans text-base mb-1">No worlds found</p>
              <p className="text-grimoire-muted font-sans text-sm mb-6">
                {searchQuery || genreFilter !== "all"
                  ? "Try adjusting your search or filters."
                  : "Deploy your first collection and generate a Living World."}
              </p>
              <Link href="/create" className="btn-primary inline-flex items-center gap-2">
                Deploy a Collection
              </Link>
            </div>
          )}
        </section>
      </div>

      <Footer />
    </main>
  );
}

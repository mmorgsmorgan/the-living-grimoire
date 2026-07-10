"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { GenreBadge } from "@/components/shared/GenreBadge";
import { NFTGallery } from "@/components/nft/NFTGallery";
import { fetchLore, type WorldDetail } from "@/lib/api";
import type { Character, Location, StoryChapter } from "@/lib/types";

type Tab = "overview" | "gallery" | "lore" | "characters" | "locations" | "stories";

export default function CollectionDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [worldData, setWorldData] = useState<WorldDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  useEffect(() => {
    if (!id) return;
    fetchLore(id)
      .then((data) => setWorldData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen grimoire-mesh">
        <Navbar />
        <div className="pt-32 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-grimoire-purple border-t-transparent rounded-full animate-spin" />
        </div>
      </main>
    );
  }

  // No lore yet — still show the collection: its NFT gallery + a prompt to
  // generate the Living World. Only valid contract addresses reach here.
  if (!worldData) {
    const isAddress = /^0x[0-9a-fA-F]{40}$/.test(id || "");
    if (!isAddress) {
      return (
        <main className="min-h-screen flex flex-col grimoire-mesh">
          <Navbar />
          <div className="pt-32 flex-1 flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 mb-4 rounded-2xl overflow-hidden border border-grimoire-border shadow-glow-purple flex items-center justify-center bg-grimoire-surface">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="font-display text-white text-2xl mb-2">Collection Not Found</h1>
            <p className="text-grimoire-muted text-sm mb-6 font-sans">This collection doesn&apos;t exist.</p>
            <Link href="/explore" className="btn-primary">Browse Worlds</Link>
          </div>
          <Footer />
        </main>
      );
    }
    return (
      <main className="min-h-screen flex flex-col grimoire-mesh">
        <Navbar />
        <div className="pt-16 flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <p className="text-xs text-grimoire-muted font-mono">{id}</p>
                <h1 className="font-display text-white text-3xl mt-1">Collection</h1>
                <p className="text-grimoire-muted text-sm mt-1 font-sans">No Living World generated yet.</p>
              </div>
              <div className="flex gap-2">
                <Link href={`/mint/${id}`} className="btn-secondary text-xs px-4 py-2">Mint</Link>
                <Link href="/create" className="btn-primary text-xs px-4 py-2">Generate World</Link>
              </div>
            </div>
            <NFTGallery contractAddress={id as `0x${string}`} />
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  // Adapt backend data to template expectations
  const world = worldData.lore;
  const collection = {
    name: worldData.name,
    description: world?.lore?.origin?.slice(0, 200) || "",
    genre: worldData.genre || "fantasy",
    tone: worldData.tone || "epic",
    contractAddress: worldData.contract,
    coverHue: Math.abs(worldData.contract.charCodeAt(4) * 7) % 360,
    world,
  };
  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "gallery", label: "Gallery" },
    { key: "lore", label: "Lore" },
    { key: "characters", label: "Characters", count: world?.characters.length },
    { key: "locations", label: "Locations", count: world?.locations.length },
    { key: "stories", label: "Stories", count: world?.chapters.length },
  ];

  return (
    <main className="min-h-screen flex flex-col grimoire-mesh">
      <Navbar />

      <div className="pt-16 flex-1">
        {/* Hero banner */}
        <div
          className="relative h-48 sm:h-64 overflow-hidden"
          style={{ background: `linear-gradient(135deg, hsl(${collection.coverHue},45%,12%), hsl(${(collection.coverHue + 60) % 360},35%,8%))` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-grimoire-bg to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 max-w-7xl mx-auto px-4 sm:px-6 pb-6">
            <GenreBadge genre={collection.genre as any} size="md" />
            <h1 className="font-display text-white text-3xl sm:text-4xl mt-2">{collection.name}</h1>
            <p className="text-grimoire-muted text-sm font-sans mt-1 max-w-2xl">{collection.description}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-grimoire-border bg-grimoire-bg/80 backdrop-blur-sm sticky top-16 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 text-sm font-sans font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.key ? "tab-active" : "tab-inactive"
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-1.5 text-[10px] font-mono opacity-60">{tab.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {/* Gallery always available — it reads NFTs straight from chain */}
          {activeTab === "gallery" && (
            <NFTGallery contractAddress={worldData.contract as `0x${string}`} />
          )}

          {/* Lore-driven tabs require a generated world */}
          {activeTab !== "gallery" && (
            !world ? (
              <div className="py-20 text-center">
                <div className="text-4xl mb-4">⏳</div>
                <p className="text-grimoire-ink font-sans">This world hasn&apos;t been generated yet.</p>
                <p className="text-grimoire-muted text-sm font-sans mt-1">The AI story engine needs to create content for this collection.</p>
              </div>
            ) : (
              <>
                {activeTab === "overview" && <OverviewTab collection={collection} />}
                {activeTab === "lore" && <LoreTab collection={collection} />}
                {activeTab === "characters" && <CharactersTab characters={world.characters} />}
                {activeTab === "locations" && <LocationsTab locations={world.locations} characters={world.characters} />}
                {activeTab === "stories" && <StoriesTab collection={collection} chapters={world.chapters} />}
              </>
            )
          )}
        </div>
      </div>

      <Footer />
    </main>
  );
}

/* ── Overview Tab ──────────────────────────────────────────── */
function OverviewTab({ collection }: { collection: any }) {
  const { world } = collection;
  if (!world) return null;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatBox label="Characters" value={`${world.characters.length}`} icon="👤" />
        <StatBox label="Locations" value={`${world.locations.length}`} icon="🗺️" />
        <StatBox label="Chapters" value={`${world.chapters.length}`} icon="📜" />
        <StatBox label="Factions" value={`${world.lore.factions.length}`} icon="⚔️" />
      </div>

      {/* World summary */}
      <div className="story-panel p-6 sm:p-8">
        <h3 className="font-display text-grimoire-gold text-lg mb-4">World Origin</h3>
        <p className="text-grimoire-ink font-body text-base leading-relaxed">{world.lore.origin}</p>
      </div>

      {/* Prophecy */}
      {world.lore.prophecy && (
        <div className="story-panel p-6 sm:p-8 border-grimoire-gold/20">
          <h3 className="font-display text-grimoire-gold text-lg mb-4">The Prophecy</h3>
          <blockquote className="text-grimoire-gold-light font-body italic text-base leading-relaxed border-l-2 border-grimoire-gold/40 pl-4">
            {world.lore.prophecy}
          </blockquote>
        </div>
      )}

      {/* Featured characters */}
      <div>
        <h3 className="font-display text-white text-lg mb-4">Key Characters</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {world.characters.slice(0, 3).map((char: any) => (
            <CharacterMiniCard key={char.id} character={char} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Lore Tab ──────────────────────────────────────────────── */
function LoreTab({ collection }: { collection: any }) {
  const { world } = collection;
  if (!world) return null;

  return (
    <div className="max-w-3xl space-y-10 animate-fade-in">
      <LoreSection title="Origin" content={world.lore.origin} />
      <LoreSection title="History" content={world.lore.history} />
      <LoreSection title="Mythology" content={world.lore.mythology} />

      {/* Factions */}
      <div>
        <h3 className="font-display text-grimoire-gold text-xl mb-6">Factions</h3>
        <div className="space-y-4">
          {world.lore.factions.map((faction: any, i: number) => (
            <div key={i} className="story-panel p-5">
              <h4 className="font-display text-white text-base mb-2">{faction.name}</h4>
              <p className="text-grimoire-ink font-body text-sm leading-relaxed mb-2">{faction.description}</p>
              <p className="text-grimoire-muted text-xs font-sans">
                <span className="text-grimoire-gold/70">Values:</span> {faction.values}
              </p>
            </div>
          ))}
        </div>
      </div>

      {world.lore.prophecy && (
        <div className="story-panel p-6 border-grimoire-gold/20">
          <h3 className="font-display text-grimoire-gold text-xl mb-4">The Prophecy</h3>
          <blockquote className="text-grimoire-gold-light font-body italic text-lg leading-relaxed border-l-2 border-grimoire-gold/40 pl-4">
            {world.lore.prophecy}
          </blockquote>
        </div>
      )}
    </div>
  );
}

function LoreSection({ title, content }: { title: string; content: string }) {
  return (
    <div>
      <h3 className="font-display text-grimoire-gold text-xl mb-4">{title}</h3>
      <div className="story-panel p-6">
        <p className="text-grimoire-ink font-body text-base leading-[1.8]">{content}</p>
      </div>
    </div>
  );
}

/* ── Characters Tab ────────────────────────────────────────── */
function CharactersTab({ characters }: { characters: Character[] }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-fade-in">
      {characters.map((char: any) => (
        <div key={char.id} className="grimoire-card p-5">
          {/* Avatar */}
          <div
            className="w-16 h-16 rounded-xl mb-4 flex items-center justify-center text-2xl font-display text-white/80"
            style={{ background: `linear-gradient(135deg, hsl(${char.imageHue},50%,20%), hsl(${(char.imageHue + 40) % 360},40%,15%))` }}
          >
            {char.name.charAt(0)}
          </div>

          <h3 className="font-display text-white text-base">{char.name}</h3>
          <p className="text-grimoire-purple-light text-xs font-sans font-semibold uppercase tracking-wider mt-0.5 mb-3">
            {char.role}
          </p>

          {/* Traits */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {char.traits.map((trait: any) => (
              <span key={trait} className="px-2 py-0.5 rounded-full bg-grimoire-surface text-grimoire-muted text-[10px] font-sans">
                {trait}
              </span>
            ))}
          </div>

          {/* Backstory */}
          <p className="text-grimoire-ink text-sm font-body leading-relaxed line-clamp-3">{char.backstory}</p>

          {/* Faction */}
          {char.faction && (
            <p className="text-[10px] font-mono text-grimoire-gold/60 mt-3">
              ⚔ {char.faction}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Locations Tab ─────────────────────────────────────────── */
function LocationsTab({ locations, characters }: { locations: Location[]; characters: Character[] }) {
  return (
    <div className="grid sm:grid-cols-2 gap-5 animate-fade-in">
      {locations.map((loc: any) => {
        const connectedChars = characters.filter((c) => loc.connectedCharacterIds.includes(c.id));
        return (
          <div key={loc.id} className="grimoire-card overflow-hidden">
            {/* Location header */}
            <div
              className="h-32 relative"
              style={{ background: `linear-gradient(135deg, hsl(${loc.imageHue},40%,15%), hsl(${(loc.imageHue + 50) % 360},30%,10%))` }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl opacity-40">🗺️</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-grimoire-elevated to-transparent">
                <span className="text-[10px] font-mono text-grimoire-teal uppercase">{loc.type}</span>
                <h3 className="font-display text-white text-base">{loc.name}</h3>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-grimoire-ink text-sm font-body leading-relaxed">{loc.description}</p>

              <div>
                <p className="text-[10px] font-sans text-grimoire-muted uppercase tracking-wider mb-1">Atmosphere</p>
                <p className="text-grimoire-purple-light text-xs font-sans">{loc.atmosphere}</p>
              </div>

              <div>
                <p className="text-[10px] font-sans text-grimoire-muted uppercase tracking-wider mb-1">Secret</p>
                <p className="text-grimoire-gold/80 text-xs font-body italic">{loc.secrets}</p>
              </div>

              {connectedChars.length > 0 && (
                <div className="flex items-center gap-1 pt-2 border-t border-grimoire-border/50">
                  <span className="text-[10px] text-grimoire-muted font-sans">Connected:</span>
                  {connectedChars.slice(0, 3).map((c: any) => (
                    <span key={c.id} className="text-[10px] font-mono text-grimoire-ink">{c.name}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Stories Tab ────────────────────────────────────────────── */
function StoriesTab({ collection, chapters }: { collection: any; chapters: StoryChapter[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="max-w-3xl space-y-4 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-white text-lg">
          {chapters.length} Chapters
        </h3>
        <Link
          href={`/story/${collection.id}`}
          className="btn-secondary text-xs px-4 py-2 inline-flex items-center gap-1"
        >
          Read Full Story →
        </Link>
      </div>

      {chapters.map((chapter: any) => (
        <div key={chapter.id} className="story-panel overflow-hidden">
          <button
            onClick={() => setExpandedId(expandedId === chapter.id ? null : chapter.id)}
            className="w-full text-left p-5 flex items-center justify-between hover:bg-grimoire-surface/20 transition-colors"
          >
            <div className="flex items-center gap-4">
              <span className="w-8 h-8 rounded-lg bg-grimoire-purple/10 border border-grimoire-purple/20 flex items-center justify-center text-grimoire-purple-light text-xs font-mono">
                {chapter.number}
              </span>
              <span className="font-display text-white text-sm">{chapter.title}</span>
            </div>
            <svg
              className={`w-4 h-4 text-grimoire-muted transition-transform ${expandedId === chapter.id ? "rotate-180" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expandedId === chapter.id && (
            <div className="px-5 pb-5 border-t border-grimoire-border/30">
              <p className="text-grimoire-ink font-body text-sm leading-[1.9] mt-4 whitespace-pre-line">
                {chapter.content}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Shared sub-components ─────────────────────────────────── */
function StatBox({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="story-panel p-4 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <p className="font-display text-white text-xl">{value}</p>
      <p className="text-grimoire-muted text-[10px] font-sans uppercase tracking-wider">{label}</p>
    </div>
  );
}

function CharacterMiniCard({ character }: { character: Character }) {
  return (
    <div className="story-panel p-4 flex items-start gap-3">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-display text-white/80 shrink-0"
        style={{ background: `linear-gradient(135deg, hsl(${character.imageHue},50%,20%), hsl(${(character.imageHue + 40) % 360},40%,15%))` }}
      >
        {character.name.charAt(0)}
      </div>
      <div className="min-w-0">
        <p className="font-display text-white text-sm">{character.name}</p>
        <p className="text-grimoire-purple-light text-[10px] font-sans uppercase tracking-wider">{character.role}</p>
        <p className="text-grimoire-muted text-xs font-sans mt-1 line-clamp-2">{character.backstory}</p>
      </div>
    </div>
  );
}

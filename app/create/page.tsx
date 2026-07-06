"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useGrimoireStore } from "@/lib/store";
import { generateLivingWorld } from "@/lib/storyEngine";
import type { Genre, StoryTone, CreateStep } from "@/lib/types";

const GENRES: { value: Genre; label: string; icon: string }[] = [
  { value: "fantasy", label: "Fantasy", icon: "🏰" },
  { value: "scifi", label: "Sci-Fi", icon: "🚀" },
  { value: "mythology", label: "Mythology", icon: "⚡" },
  { value: "cyberpunk", label: "Cyberpunk", icon: "🌃" },
  { value: "horror", label: "Horror", icon: "🕯️" },
  { value: "adventure", label: "Adventure", icon: "🗺️" },
];

const TONES: { value: StoryTone; label: string }[] = [
  { value: "epic", label: "Epic" },
  { value: "dark", label: "Dark" },
  { value: "whimsical", label: "Whimsical" },
  { value: "mysterious", label: "Mysterious" },
  { value: "heroic", label: "Heroic" },
  { value: "tragic", label: "Tragic" },
];

export default function CreatePage() {
  const router = useRouter();
  const { addCollection, hydrate, isHydrated } = useGrimoireStore();

  const [step, setStep] = useState<CreateStep>("choose-path");
  const [path, setPath] = useState<"import" | "new" | null>(null);
  const [contractAddress, setContractAddress] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState<Genre>("fantasy");
  const [tone, setTone] = useState<StoryTone>("epic");
  const [isGenerating, setIsGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [genStatus, setGenStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isHydrated) hydrate();
  }, [hydrate, isHydrated]);

  const handleChoosePath = (p: "import" | "new") => {
    setPath(p);
    setStep("details");
  };

  const handleGenerate = useCallback(async () => {
    if (!name.trim()) {
      setError("Please enter a collection name.");
      return;
    }
    setError("");
    setStep("generating");
    setIsGenerating(true);
    setGenProgress(0);

    const stages = [
      { pct: 15, status: "Analyzing collection metadata…" },
      { pct: 30, status: "Generating world lore…" },
      { pct: 50, status: "Creating characters…" },
      { pct: 70, status: "Building locations…" },
      { pct: 85, status: "Writing story chapters…" },
      { pct: 95, status: "Finalizing world…" },
    ];

    for (const stage of stages) {
      setGenProgress(stage.pct);
      setGenStatus(stage.status);
      await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));
    }

    try {
      const world = await generateLivingWorld(name, genre, tone, 0);

      const collectionId = Math.random().toString(36).slice(2, 10);
      const newCollection = {
        id: collectionId,
        name: name.trim(),
        description: description.trim() || `A ${genre} world brought to life by AI.`,
        contractAddress: path === "import" ? contractAddress : undefined,
        chainId: 1979,
        genre,
        tone,
        coverHue: Math.floor(Math.random() * 360),
        nftCount: 0,
        world,
        createdAt: Date.now(),
        status: "published" as const,
      };

      addCollection(newCollection);
      setGenProgress(100);
      setGenStatus("World created successfully!");
      await new Promise((r) => setTimeout(r, 800));
      setStep("preview");
      setIsGenerating(false);

      // Navigate to the new collection
      router.push(`/collection/${collectionId}`);
    } catch {
      setError("Failed to generate world. Please try again.");
      setStep("details");
      setIsGenerating(false);
    }
  }, [name, description, genre, tone, path, contractAddress, addCollection, router]);

  return (
    <main className="min-h-screen flex flex-col grimoire-mesh">
      <Navbar />

      <div className="pt-16 flex-1">
        <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-12 pb-24">
          {/* Header */}
          <div className="mb-10">
            <p className="text-xs text-grimoire-purple-light uppercase tracking-widest font-mono mb-2">Create</p>
            <h1 className="font-display text-white text-3xl sm:text-4xl mb-2">
              Create a Living World
            </h1>
            <p className="text-grimoire-muted text-sm font-sans">
              Transform an NFT collection into an interactive story world with AI-generated narrative.
            </p>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center gap-2 mb-10">
            {["choose-path", "details", "generating"].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono border transition-colors ${
                  step === s || (i === 0 && step !== "choose-path") || (i === 1 && (step === "generating" || step === "preview"))
                    ? "bg-grimoire-purple/20 border-grimoire-purple text-grimoire-purple-light"
                    : "bg-grimoire-surface border-grimoire-border text-grimoire-muted"
                }`}>
                  {i + 1}
                </div>
                {i < 2 && <div className="w-12 h-px bg-grimoire-border" />}
              </div>
            ))}
          </div>

          {/* Step 1: Choose path */}
          {step === "choose-path" && (
            <div className="grid sm:grid-cols-2 gap-5 animate-fade-in">
              <button
                onClick={() => handleChoosePath("import")}
                className="story-panel p-8 text-left hover:border-grimoire-purple/40 transition-all group"
              >
                <div className="text-4xl mb-4">🔗</div>
                <h3 className="font-display text-white text-lg mb-2">Import Existing Collection</h3>
                <p className="text-grimoire-muted text-sm font-sans leading-relaxed">
                  Paste an NFT contract address and let AI generate a story world based on the collection&apos;s metadata.
                </p>
                <span className="inline-block mt-4 text-grimoire-purple-light text-xs font-sans font-semibold group-hover:translate-x-1 transition-transform">
                  Get started →
                </span>
              </button>

              <button
                onClick={() => handleChoosePath("new")}
                className="story-panel p-8 text-left hover:border-grimoire-gold/40 transition-all group"
              >
                <div className="text-4xl mb-4">✨</div>
                <h3 className="font-display text-white text-lg mb-2">Create New Collection</h3>
                <p className="text-grimoire-muted text-sm font-sans leading-relaxed">
                  Define a new NFT collection and let AI create a complete living world from scratch.
                </p>
                <span className="inline-block mt-4 text-grimoire-gold text-xs font-sans font-semibold group-hover:translate-x-1 transition-transform">
                  Get started →
                </span>
              </button>
            </div>
          )}

          {/* Step 2: Details */}
          {step === "details" && (
            <div className="space-y-6 animate-fade-in">
              {path === "import" && (
                <div>
                  <label className="block text-xs text-grimoire-muted uppercase tracking-wider font-sans mb-2">
                    Contract Address
                  </label>
                  <input
                    type="text"
                    placeholder="0x..."
                    value={contractAddress}
                    onChange={(e) => setContractAddress(e.target.value)}
                    className="w-full px-4 py-3 bg-grimoire-elevated border border-grimoire-border rounded-xl text-sm text-grimoire-ink font-mono placeholder-grimoire-muted/50 focus:outline-none focus:border-grimoire-purple/50 transition-colors"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs text-grimoire-muted uppercase tracking-wider font-sans mb-2">
                  Collection Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. The Forgotten Realms"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-grimoire-elevated border border-grimoire-border rounded-xl text-sm text-grimoire-ink font-sans placeholder-grimoire-muted/50 focus:outline-none focus:border-grimoire-purple/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs text-grimoire-muted uppercase tracking-wider font-sans mb-2">
                  Description (optional)
                </label>
                <textarea
                  placeholder="A brief description of your collection…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-grimoire-elevated border border-grimoire-border rounded-xl text-sm text-grimoire-ink font-sans placeholder-grimoire-muted/50 focus:outline-none focus:border-grimoire-purple/50 transition-colors resize-none"
                />
              </div>

              {/* Genre selector */}
              <div>
                <label className="block text-xs text-grimoire-muted uppercase tracking-wider font-sans mb-3">
                  Genre
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {GENRES.map((g) => (
                    <button
                      key={g.value}
                      onClick={() => setGenre(g.value)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        genre === g.value
                          ? "bg-grimoire-purple/15 border-grimoire-purple/50 text-white"
                          : "bg-grimoire-elevated border-grimoire-border text-grimoire-muted hover:border-grimoire-border hover:text-grimoire-ink"
                      }`}
                    >
                      <div className="text-xl mb-1">{g.icon}</div>
                      <div className="text-[10px] font-sans font-semibold">{g.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tone selector */}
              <div>
                <label className="block text-xs text-grimoire-muted uppercase tracking-wider font-sans mb-3">
                  Narrative Tone
                </label>
                <div className="flex flex-wrap gap-2">
                  {TONES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setTone(t.value)}
                      className={`px-4 py-2 rounded-lg border text-xs font-sans font-semibold transition-all ${
                        tone === t.value
                          ? "bg-grimoire-gold/10 border-grimoire-gold/40 text-grimoire-gold"
                          : "bg-grimoire-elevated border-grimoire-border text-grimoire-muted hover:text-grimoire-ink"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-grimoire-crimson/10 border border-grimoire-crimson/20 rounded-lg text-grimoire-crimson text-sm font-sans">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4">
                <button onClick={() => setStep("choose-path")} className="btn-secondary px-6 py-3">
                  ← Back
                </button>
                <button onClick={handleGenerate} className="btn-primary px-8 py-3 flex-1 sm:flex-none">
                  Generate Living World ✦
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Generating */}
          {step === "generating" && (
            <div className="text-center py-16 animate-fade-in">
              {/* Animated grimoire */}
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-grimoire-purple/20 to-grimoire-gold/20 border border-grimoire-border flex items-center justify-center mx-auto mb-8 animate-float">
                <span className="text-5xl animate-rune-glow">✨</span>
              </div>

              <h2 className="font-display text-white text-2xl mb-2">Generating Your Living World</h2>
              <p className="text-grimoire-muted text-sm font-sans mb-8">{genStatus}</p>

              {/* Progress bar */}
              <div className="max-w-md mx-auto">
                <div className="grimoire-progress-track">
                  <div
                    className="grimoire-progress-fill"
                    style={{ width: `${genProgress}%` }}
                  />
                </div>
                <p className="text-grimoire-muted text-xs font-mono mt-3">{genProgress}%</p>
              </div>

              {/* Generation stages */}
              <div className="max-w-sm mx-auto mt-8 space-y-2 text-left">
                {[
                  { label: "Analyzing metadata", threshold: 15 },
                  { label: "Building world lore", threshold: 30 },
                  { label: "Creating characters", threshold: 50 },
                  { label: "Designing locations", threshold: 70 },
                  { label: "Writing chapters", threshold: 85 },
                  { label: "Finalizing world", threshold: 95 },
                ].map((stage) => (
                  <div key={stage.label} className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                      genProgress >= stage.threshold
                        ? "bg-grimoire-purple/20 border-grimoire-purple text-grimoire-purple-light"
                        : "border-grimoire-border text-transparent"
                    }`}>
                      {genProgress >= stage.threshold && (
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
                          <path d="M1 4l2 2 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-xs font-sans ${genProgress >= stage.threshold ? "text-grimoire-ink" : "text-grimoire-muted/50"}`}>
                      {stage.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      <Footer />
    </main>
  );
}

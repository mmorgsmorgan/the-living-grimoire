"use client";

import Link from "next/link";

export function HeroLanding() {
  return (
    <section className="relative pt-36 pb-24 px-4 sm:px-6 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 grimoire-mesh pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-grimoire-purple/5 blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 w-[400px] h-[400px] rounded-full bg-grimoire-gold/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-grimoire-ember/3 blur-[80px] pointer-events-none" />

      <div className="relative max-w-5xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full border border-grimoire-purple/20 bg-grimoire-purple/5 text-grimoire-purple-light text-xs font-mono uppercase tracking-wider animate-fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-grimoire-purple animate-pulse" />
          AI-Powered · Ritual Chain
        </div>

        {/* Grimoire icon */}
        <div className="flex justify-center mb-8 animate-fade-in" style={{ animationDelay: "0.05s" }}>
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-grimoire-purple/20 to-grimoire-gold/20 border border-grimoire-border flex items-center justify-center animate-float">
            <span className="text-5xl" role="img" aria-label="book">📖</span>
          </div>
        </div>

        {/* Headline */}
        <h1
          className="font-display text-white mb-6 animate-fade-in"
          style={{ fontSize: "clamp(2.2rem, 5.5vw, 4.2rem)", lineHeight: 1.1, letterSpacing: "0.01em", animationDelay: "0.1s" }}
        >
          Every NFT Has a Story
          <span className="block mt-2 bg-gradient-to-r from-grimoire-gold via-grimoire-gold-light to-grimoire-ember bg-clip-text text-transparent">
            Waiting to Be Told
          </span>
        </h1>

        {/* Description */}
        <p className="text-grimoire-muted max-w-2xl mx-auto text-lg leading-relaxed font-body animate-fade-in" style={{ animationDelay: "0.2s" }}>
          The Living Grimoire transforms NFT collections into interactive story worlds.
          AI reads your NFTs and generates rich lore, memorable characters, mystical locations,
          and unfolding narratives — bringing every collection to life.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <Link href="/explore" className="btn-primary text-base px-8 py-3.5 inline-flex items-center gap-2">
            Explore Worlds
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </Link>
          <Link href="/create" className="btn-secondary text-base px-8 py-3.5 inline-flex items-center gap-2">
            Create a World
            <span className="text-lg">✦</span>
          </Link>
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-10 mt-16 animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <Stat label="Chain" value="Ritual 1979" />
          <div className="w-px bg-grimoire-border self-stretch" />
          <Stat label="Standard" value="ERC-721" />
          <div className="w-px bg-grimoire-border self-stretch" />
          <Stat label="AI Engine" value="Active" accent />
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="text-center">
      <p className="text-[11px] text-grimoire-muted uppercase tracking-wider mb-1 font-sans">{label}</p>
      <p className={`text-lg font-semibold font-sans ${accent ? "text-grimoire-purple-light animate-rune-glow" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}

"use client";

import { COLLECTION, MAX_SUPPLY } from "@/lib/contracts";

/** Hero section — collection name, description, animated badge */
export function HeroSection() {
  return (
    <section className="relative pt-32 pb-16 px-4 sm:px-6 overflow-hidden">
      {/* Background mesh */}
      <div className="absolute inset-0 ritual-mesh pointer-events-none" />

      {/* Decorative orbs */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 rounded-full bg-ritual-green/5 blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full bg-ritual-pink/5 blur-3xl pointer-events-none" />

      <div className="relative max-w-6xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full border border-ritual-green/20 bg-ritual-green/5 text-ritual-green text-xs font-mono uppercase tracking-wider animate-fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-ritual-green animate-pulse" />
          Live on Ritual Chain · {MAX_SUPPLY} Total Supply
        </div>

        {/* Headline */}
        <h1
          className="font-display text-white mb-6 animate-fade-in"
          style={{
            fontSize: "clamp(2.5rem, 6vw, 5rem)",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            animationDelay: "0.1s",
          }}
        >
          {COLLECTION.name}
          <span
            className="block mt-2"
            style={{ color: "#19D184" }}
          >
            by Zuma
          </span>
        </h1>

        {/* Description */}
        <p
          className="text-gray-400 max-w-2xl mx-auto text-lg leading-relaxed animate-fade-in"
          style={{ animationDelay: "0.2s" }}
        >
          {COLLECTION.description}
        </p>

        {/* Stats row */}
        <div
          className="flex justify-center gap-8 mt-12 animate-fade-in"
          style={{ animationDelay: "0.3s" }}
        >
          <Stat label="Total Supply" value={`${MAX_SUPPLY}`} />
          <div className="w-px bg-gray-800 self-stretch" />
          <Stat label="Chain" value="Ritual 1979" mono />
          <div className="w-px bg-gray-800 self-stretch" />
          <Stat label="Standard" value="ERC-721" />
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="text-center">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p
        className={`text-xl text-gray-100 font-semibold ${mono ? "font-mono" : "font-body"}`}
      >
        {value}
      </p>
    </div>
  );
}

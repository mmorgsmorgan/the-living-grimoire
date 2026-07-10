"use client";

export function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Deploy Your Collection",
      description: "Upload images, set mint phases, configure royalties, and deploy your ERC-721A collection directly to Ritual Chain.",
    },
    {
      number: "02",
      title: "AI Generates the World",
      description: "Our AI engine reads the NFT metadata and generates rich lore, compelling characters, mystical locations, and an unfolding narrative.",
    },
    {
      number: "03",
      title: "Explore and Share",
      description: "Dive into your collection's living world. Read the story, meet the characters, explore the locations, and share the experience.",
    },
  ];

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
      <div className="text-center mb-16">
        <p className="text-xs text-grimoire-purple-light uppercase tracking-widest font-mono mb-3">How It Works</p>
        <h2 className="font-display text-white text-3xl sm:text-4xl">
          From Static NFTs to{" "}
          <span className="bg-gradient-to-r from-grimoire-gold to-grimoire-ember bg-clip-text text-transparent">
            Living Worlds
          </span>
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {steps.map((step, i) => (
          <div
            key={step.number}
            className="story-panel p-8 text-center group hover:border-grimoire-purple/30 transition-all duration-300 animate-fade-in-up"
            style={{ animationDelay: `${i * 0.15}s` }}
          >
            {/* Step number */}
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-grimoire-purple/10 border border-grimoire-purple/20 text-grimoire-purple-light font-mono text-base mb-6 group-hover:bg-grimoire-purple/20 group-hover:border-grimoire-purple/40 transition-colors">
              {step.number}
            </div>

            {/* Title */}
            <h3 className="font-display text-white text-lg mb-3">{step.title}</h3>

            {/* Description */}
            <p className="text-grimoire-muted text-sm leading-relaxed font-sans">{step.description}</p>

            {/* Connector line (not on last) */}
            {i < steps.length - 1 && (
              <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-px bg-gradient-to-r from-grimoire-border to-transparent" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

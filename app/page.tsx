"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroLanding } from "@/components/landing/HeroLanding";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { useGrimoireStore } from "@/lib/store";
import { CollectionCard } from "@/components/explore/CollectionCard";
import Link from "next/link";
import { useEffect } from "react";

export default function Home() {
  const { collections, hydrate, isHydrated } = useGrimoireStore();

  useEffect(() => {
    if (!isHydrated) hydrate();
  }, [hydrate, isHydrated]);

  const recentCollections = collections
    .filter((c) => c.status === "published")
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 4);

  return (
    <main className="min-h-screen flex flex-col grimoire-mesh">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[70] focus:px-4 focus:py-2 focus:bg-grimoire-purple focus:text-white focus:rounded-lg focus:font-semibold"
      >
        Skip to content
      </a>

      <Navbar />

      <div id="content" className="pt-16 flex-1">
        <HeroLanding />
        <HowItWorks />

        {/* Recent Worlds Section */}
        {recentCollections.length > 0 && (
          <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-24">
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-xs text-grimoire-purple-light uppercase tracking-widest font-mono mb-2">Recently Created</p>
                <h2 className="font-display text-white text-2xl">Living Worlds</h2>
              </div>
              <Link
                href="/explore"
                className="text-sm text-grimoire-gold hover:text-grimoire-gold-light transition-colors font-sans"
              >
                View all →
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentCollections.map((collection) => (
                <CollectionCard key={collection.id} collection={collection} />
              ))}
            </div>
          </section>
        )}

        {/* Empty state CTA when no collections */}
        {recentCollections.length === 0 && (
          <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-24 text-center">
            <div className="story-panel p-12">
              <div className="w-16 h-16 rounded-full bg-grimoire-gold/10 border border-grimoire-gold/20 flex items-center justify-center mx-auto mb-5 text-3xl">
                ✦
              </div>
              <h2 className="font-display text-white text-xl mb-3">No Living Worlds Yet</h2>
              <p className="text-grimoire-muted text-sm mb-6 font-sans max-w-md mx-auto">
                Be the first to create a Living World. Import an existing NFT collection or launch a new one with AI-generated stories.
              </p>
              <Link href="/create" className="btn-primary inline-flex items-center gap-2">
                Create Your First World
                <span>✦</span>
              </Link>
            </div>
          </section>
        )}
      </div>

      <Footer />
    </main>
  );
}

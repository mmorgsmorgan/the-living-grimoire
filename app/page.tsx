"use client";

import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { MintSection } from "@/components/MintSection";
import { GallerySection } from "@/components/GallerySection";
import { useMintProgress } from "@/hooks/useMintProgress";

/**
 * Home page — assembles all sections.
 * useMintProgress is hoisted here so GallerySection can read minted count
 * without a second contract read.
 */
export default function Home() {
  const mintProgress = useMintProgress();
  const { minted } = mintProgress;

  return (
    <main className="min-h-screen ritual-mesh">
      {/* Accessible skip link */}
      <a
        href="#mint"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-ritual-green focus:text-black focus:rounded-lg focus:font-semibold"
      >
        Skip to mint
      </a>

      <Header />
      <HeroSection />
      <MintSection mintProgress={mintProgress} />
      <GallerySection mintedCount={minted} />

      {/* Footer */}
      <footer className="border-t border-gray-800/50 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-600">
          <span className="font-mono">Ritual Genesis · Chain 1979</span>
          <div className="flex items-center gap-4">
            <a
              href="https://explorer.ritualfoundation.org"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-ritual-green transition-colors"
            >
              Explorer ↗
            </a>
            <a
              href="https://docs.ritualfoundation.org"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-ritual-green transition-colors"
            >
              Docs ↗
            </a>
            <a
              href="https://faucet.ritualfoundation.org"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-ritual-green transition-colors"
            >
              Faucet ↗
            </a>
          </div>
          <span className="font-mono">
            © {new Date().getFullYear()} Ritual Foundation
          </span>
        </div>
      </footer>
    </main>
  );
}

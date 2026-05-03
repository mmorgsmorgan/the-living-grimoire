"use client";

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { resolveMintedNft } from "@/lib/nftMetadata";

/** Generate placeholder NFT image hue deterministically from token ID */
function getTokenHue(tokenId: number): number {
  const hues = [160, 320, 200, 280, 140, 180, 260, 300];
  return hues[tokenId % hues.length];
}

/** Individual NFT card shown in the gallery grid */
function NFTCard({ tokenId, isMinted }: { tokenId: number; isMinted: boolean }) {
  const publicClient = usePublicClient();
  const [image, setImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(isMinted);

  useEffect(() => {
    if (!publicClient || !isMinted) {
      setImageLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchMetadata() {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const nft = await resolveMintedNft(publicClient!, tokenId);
          if (cancelled) return;
          if (nft?.image) {
            setImage(nft.image);
            setImageLoading(false);
            return;
          }
        } catch (err) {
          console.error(`Failed to fetch metadata for #${tokenId}:`, err);
        }

        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, 600 * attempt));
        }
      }

      if (!cancelled) setImageLoading(false);
    }

    void fetchMetadata();

    return () => {
      cancelled = true;
    };
  }, [tokenId, publicClient, isMinted]);

  const hue = getTokenHue(tokenId);
  const altHue = (hue + 60) % 360;

  return (
    <div className="nft-card group cursor-pointer">
      {/* Image or animated placeholder */}
      <div
        className="aspect-square w-full flex items-center justify-center relative overflow-hidden"
        style={
          !image
            ? { background: `linear-gradient(135deg, hsl(${hue},70%,25%), hsl(${altHue},60%,18%))` }
            : {}
        }
      >
        {image ? (
          <img
            src={image}
            alt={`Ritual Genesis #${tokenId}`}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            onLoad={() => setImageLoading(false)}
          />
        ) : (
          <>
            {/* Geometric placeholder art */}
            <div className="absolute inset-0 opacity-25 pointer-events-none">
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border-2 rotate-45 transition-transform duration-500 group-hover:rotate-90"
                style={{ borderColor: `hsl(${hue},80%,55%)` }}
              />
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 border border-dashed rotate-12 transition-transform duration-700 group-hover:-rotate-45"
                style={{ borderColor: `hsl(${altHue},70%,50%)` }}
              />
            </div>

            {/* Token number */}
            <span className="font-display text-white/60 text-3xl z-10 select-none">
              #{tokenId}
            </span>
          </>
        )}

        {/* Loading shimmer overlay */}
        {imageLoading && !image && (
          <div className="absolute inset-0 bg-black/30 animate-pulse" />
        )}
      </div>

      {/* Card footer */}
      <div className="p-3 flex justify-between items-center">
        <div>
          <p className="font-body font-semibold text-gray-300 text-sm leading-tight">
            Ritual Genesis #{tokenId}
          </p>
          <p className="font-mono text-[11px] text-gray-600 mt-0.5">ERC-721</p>
        </div>
        {isMinted && (
          <span className="text-[10px] font-mono text-ritual-green/70 border border-ritual-green/20 rounded px-1.5 py-0.5">
            Minted
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * GallerySection — shows recent minted NFT cards from the blockchain.
 *
 * FIX: When mintedCount === 0, render a proper empty state instead of an
 *      empty grid that still shows locked slots.
 * FIX: Cancelled fetch via cleanup function to avoid state updates on unmounted cards.
 */
export function GallerySection({ mintedCount }: { mintedCount: number }) {
  const mintedVisibleCount = Math.min(mintedCount, 12);
  // Most recently minted first
  const recentMintedTokenIds = Array.from(
    { length: mintedVisibleCount },
    (_, i) => mintedCount - i
  );

  // Locked placeholder slots (fill grid to at least 6 cards when few minted)
  const lockedCount = mintedCount === 0 ? 0 : Math.max(0, 6 - mintedVisibleCount);

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-24">
      {/* Section header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Collection Preview</p>
          <h2 className="font-display text-white text-2xl">Recent Mints</h2>
        </div>
        {mintedCount > 12 && (
          <p className="text-xs text-gray-600 font-mono">+{mintedCount - 12} more minted</p>
        )}
      </div>

      {/* Empty state — no mints yet */}
      {mintedCount === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center text-center border border-dashed border-gray-800 rounded-2xl">
          <div className="w-16 h-16 rounded-full bg-ritual-green/5 border border-ritual-green/20 flex items-center justify-center mb-4 text-3xl">
            ⊘
          </div>
          <p className="text-gray-400 font-body text-base mb-1">No NFTs minted yet</p>
          <p className="text-gray-600 font-mono text-sm">Be the first to forge a genesis artifact.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* Minted cards */}
          {recentMintedTokenIds.map((id) => (
            <NFTCard key={id} tokenId={id} isMinted />
          ))}

          {/* Locked / not-yet-minted placeholder slots */}
          {Array.from({ length: lockedCount }, (_, i) => (
            <div
              key={`locked-${i}`}
              className="nft-card aspect-square flex flex-col items-center justify-center text-gray-700 select-none"
            >
              <span className="text-3xl mb-1">⊘</span>
              <span className="text-xs font-mono">Not minted</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { resolveMintedNft } from "@/lib/nftMetadata";

/** Generate placeholder NFT image colors deterministically from token ID */
function getTokenColor(tokenId: number): string {
  const hues = [160, 320, 200, 280, 140, 180, 260, 300];
  const hue = hues[tokenId % hues.length];
  return `hsl(${hue}, 70%, 40%)`;
}

/** NFT card shown in the gallery grid */
function NFTCard({ tokenId, isMinted }: { tokenId: number; isMinted: boolean }) {
  const publicClient = usePublicClient();
  const [image, setImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(isMinted);

  useEffect(() => {
    async function fetchMetadata() {
      if (!publicClient || !isMinted) {
        setIsLoading(false);
        return;
      }
      try {
        for (let attempt = 1; attempt <= 3; attempt++) {
          const nft = await resolveMintedNft(publicClient, tokenId);
          if (nft?.image) {
            setImage(nft.image);
            break;
          }

          if (attempt < 3) {
            await new Promise((resolve) => setTimeout(resolve, 600 * attempt));
          }
        }
      } catch (err) {
        console.error(`Failed to fetch metadata for #${tokenId}:`, err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMetadata();
  }, [tokenId, publicClient]);

  const bg = getTokenColor(tokenId);
  const altHue = (parseInt(bg.match(/\d+/)![0]) + 60) % 360;

  return (
    <div className="nft-card group cursor-pointer">
      {/* Image or Placeholder */}
      <div
        className="aspect-square w-full flex items-center justify-center relative overflow-hidden bg-black/20"
        style={!image ? {
          background: `linear-gradient(135deg, ${bg}, hsl(${altHue}, 60%, 30%))`,
        } : {}}
      >
        {image ? (
          <img
            src={image}
            alt={`Ritual Genesis #${tokenId}`}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            onLoad={() => setIsLoading(false)}
          />
        ) : (
          <>
            {/* Geometric pattern for placeholder */}
            <div className="absolute inset-0 opacity-20">
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 rotate-45 transition-transform duration-500 group-hover:rotate-90"
                style={{ borderColor: "rgba(25,209,132,0.6)" }}
              />
            </div>
            {/* Token number */}
            <span className="font-display text-white/80 text-4xl z-10">
              #{tokenId}
            </span>
          </>
        )}

        {isLoading && !image && (
          <div className="absolute inset-0 bg-black/40 animate-pulse flex items-center justify-center">
            <span className="text-ritual-green/40 text-xs font-mono">Loading...</span>
          </div>
        )}
      </div>

      {/* Card metadata */}
      <div className="p-3">
        <p className="font-body font-semibold text-gray-300 text-sm">
          Ritual Genesis #{tokenId}
        </p>
        <p className="font-mono text-xs text-gray-600 mt-0.5">
          Token ID: {tokenId}
        </p>
      </div>
    </div>
  );
}

/**
 * GallerySection — shows real NFT cards from the blockchain.
 */
export function GallerySection({ mintedCount }: { mintedCount: number }) {
  // Show the most recently minted token IDs first (max 12).
  const mintedVisibleCount = Math.min(mintedCount, 12);
  const recentMintedTokenIds = Array.from({ length: mintedVisibleCount }, (_, i) => mintedCount - i);

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-24">
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Collection Preview</p>
          <h2 className="font-display text-white text-2xl">Recent Mints</h2>
        </div>
        {mintedCount > 12 && (
          <p className="text-xs text-gray-600 font-mono">
            +{mintedCount - 12} more minted
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {recentMintedTokenIds.map((id) => (
          <NFTCard key={id} tokenId={id} isMinted />
        ))}

        {/* Locked slots */}
        {Array.from({ length: Math.max(0, 6 - mintedVisibleCount) }, (_, i) => (
          <div
            key={`locked-${i}`}
            className="nft-card aspect-square flex flex-col items-center justify-center text-gray-700"
          >
            <span className="text-3xl mb-1">⊘</span>
            <span className="text-xs font-mono">Not minted</span>
          </div>
        ))}
      </div>

      {mintedCount === 0 && (
        <p className="text-center text-gray-600 text-sm font-mono mt-8">
          No NFTs minted yet. Be the first.
        </p>
      )}
    </section>
  );
}

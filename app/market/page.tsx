"use client";

// =============================================
// The Living Grimoire — Marketplace
// =============================================
// A chain-read feed of every active listing across factory
// collections. No indexer dependency: scans getAllCollections →
// totalSupply → getListing via multicall.

import { useEffect, useMemo, useState } from "react";
import { usePublicClient } from "wagmi";
import { formatEther, type Address } from "viem";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  FACTORY_ADDRESS,
  NFTFactory_ABI,
  AIRitualNFT_ABI,
  MARKETPLACE_ADDRESS,
  RitualMarketplace_ABI,
} from "@/lib/contracts";
import { resolveIPFSGateway } from "@/lib/pinata";

interface Listing {
  contractAddress: Address;
  collectionName: string;
  symbol: string;
  baseURI: string;
  tokenId: number;
  price: bigint;
  seller: string;
}

const MAX_TOKENS_PER_COLLECTION = 60;

export default function MarketPage() {
  const publicClient = usePublicClient();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!publicClient) return;
    let cancelled = false;

    async function scan() {
      setLoading(true);
      const found: Listing[] = [];
      try {
        const collections = (await publicClient!.readContract({
          address: FACTORY_ADDRESS,
          abi: NFTFactory_ABI,
          functionName: "getAllCollections",
        })) as Address[];

        for (const collection of collections) {
          try {
            const [name, symbol, baseURI, maxSupply, totalSupplyRaw] = await Promise.all([
              publicClient!.readContract({ address: collection, abi: AIRitualNFT_ABI, functionName: "name" }).catch(() => "Collection"),
              publicClient!.readContract({ address: collection, abi: AIRitualNFT_ABI, functionName: "symbol" }).catch(() => ""),
              publicClient!.readContract({ address: collection, abi: AIRitualNFT_ABI, functionName: "baseURI" }).catch(() => ""),
              publicClient!.readContract({ address: collection, abi: AIRitualNFT_ABI, functionName: "maxSupply" }).catch(() => BigInt(0)) as Promise<bigint>,
              publicClient!.readContract({ address: collection, abi: AIRitualNFT_ABI, functionName: "totalSupply" }).catch(() => BigInt(0)) as Promise<bigint>,
            ]);

            const supply = Number(maxSupply);
            const rawMinted = Number(totalSupplyRaw);
            const minted = supply > 0 && rawMinted > supply ? 0 : rawMinted;
            const scanCount = Math.min(minted, MAX_TOKENS_PER_COLLECTION);
            if (scanCount === 0) continue;

            // Ritual has no multicall3 — read listings individually.
            const results = await Promise.all(
              Array.from({ length: scanCount }, (_, i) =>
                publicClient!
                  .readContract({
                    address: MARKETPLACE_ADDRESS,
                    abi: RitualMarketplace_ABI,
                    functionName: "getListing",
                    args: [collection, BigInt(i + 1)],
                  })
                  .catch(() => null)
              )
            );

            results.forEach((listing: any, i) => {
              if (listing?.active === true) {
                found.push({
                  contractAddress: collection,
                  collectionName: name as string,
                  symbol: symbol as string,
                  baseURI: baseURI as string,
                  tokenId: i + 1,
                  price: listing.price as bigint,
                  seller: listing.seller as string,
                });
              }
            });
          } catch {
            // skip incompatible collection
          }
        }

        if (!cancelled) setListings(found);
      } catch {
        if (!cancelled) setListings([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    scan();
    return () => { cancelled = true; };
  }, [publicClient]);

  const sorted = useMemo(() => [...listings].sort((a, b) => (a.price < b.price ? -1 : 1)), [listings]);

  return (
    <main className="min-h-screen flex flex-col grimoire-mesh">
      <Navbar />

      <div className="pt-16 flex-1">
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-24">
          <div className="mb-10">
            <p className="text-xs text-grimoire-purple-light uppercase tracking-widest font-mono mb-2">Marketplace</p>
            <h1 className="font-display text-white text-3xl sm:text-4xl mb-4">Artifacts For Sale</h1>
            <p className="text-grimoire-muted text-base font-sans max-w-2xl">
              Every NFT listed across the Living Grimoire. Each one carries the world it was born into.
            </p>
          </div>

          {loading ? (
            <div className="py-24 text-center">
              <p className="text-grimoire-muted text-sm font-mono animate-pulse">Scanning the marketplace...</p>
            </div>
          ) : sorted.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {sorted.map((l) => {
                const cover = l.baseURI && !l.baseURI.endsWith("/") ? resolveIPFSGateway(l.baseURI) : "";
                return (
                  <Link
                    key={`${l.contractAddress}-${l.tokenId}`}
                    href={`/collection/${l.contractAddress}/token/${l.tokenId}`}
                    className="story-panel overflow-hidden group hover:border-grimoire-purple/40 transition-all"
                  >
                    <div className="aspect-square overflow-hidden relative bg-grimoire-elevated">
                      {cover ? (
                        <img src={cover} alt={`#${l.tokenId}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-display text-3xl text-grimoire-purple-light/15">
                          {l.symbol?.slice(0, 2) || "#"}
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <div className="font-display text-white text-xs truncate">{l.collectionName} #{l.tokenId}</div>
                      <div className="text-[10px] font-mono text-grimoire-purple-light mt-0.5">{formatEther(l.price)} RITUAL</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="py-24 flex flex-col items-center justify-center text-center border border-dashed border-grimoire-border rounded-2xl">
              <p className="text-white font-sans text-base mb-1">Nothing listed yet</p>
              <p className="text-grimoire-muted font-sans text-sm mb-6">Be the first to list an artifact from your collection.</p>
              <Link href="/explore" className="btn-primary inline-flex items-center gap-2">Browse Worlds</Link>
            </div>
          )}
        </section>
      </div>

      <Footer />
    </main>
  );
}

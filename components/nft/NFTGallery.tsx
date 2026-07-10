"use client";

// =============================================
// The Living Grimoire — On-chain NFT Gallery
// =============================================
// Renders the minted tokens of a collection, reading ownership +
// marketplace listing state directly from Ritual Chain via multicall.
// Each card links to the token's item page (buy / sell / lore).

import { useMemo } from "react";
import Link from "next/link";
import { useReadContract, useReadContracts } from "wagmi";
import { formatEther } from "viem";
import { MARKETPLACE_ADDRESS, RitualMarketplace_ABI, AIRitualNFT_ABI } from "@/lib/contracts";
import { resolveIPFSGateway } from "@/lib/pinata";

const COLLECTION_ABI = [
  ...AIRitualNFT_ABI,
  { inputs: [], name: "totalSupply", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

export function NFTGallery({ contractAddress }: { contractAddress: `0x${string}` }) {
  const { data: maxSupply } = useReadContract({ address: contractAddress, abi: COLLECTION_ABI, functionName: "maxSupply" });
  const { data: totalSupplyRaw } = useReadContract({ address: contractAddress, abi: COLLECTION_ABI, functionName: "totalSupply" });
  const { data: baseURI } = useReadContract({ address: contractAddress, abi: AIRitualNFT_ABI, functionName: "baseURI" });

  // ERC721A clones can underflow totalSupply if constructor didn't run
  const supply = Number(maxSupply ?? BigInt(0));
  const rawMinted = Number(totalSupplyRaw ?? BigInt(0));
  const minted = supply > 0 && rawMinted > supply ? 0 : rawMinted;

  // Cap the on-chain scan to keep the multicall reasonable
  const scanCount = Math.min(minted, 60);
  const tokenIds = useMemo(() => Array.from({ length: scanCount }, (_, i) => BigInt(i + 1)), [scanCount]);

  // Multicall ownerOf + getListing for each token
  const { data: reads, isLoading } = useReadContracts({
    contracts: tokenIds.flatMap((id) => [
      { address: contractAddress, abi: AIRitualNFT_ABI, functionName: "ownerOf", args: [id] } as const,
      { address: MARKETPLACE_ADDRESS, abi: RitualMarketplace_ABI, functionName: "getListing", args: [contractAddress, id] } as const,
    ]),
    query: { enabled: scanCount > 0 },
  });

  const tokens = useMemo(() => {
    if (!reads) return [];
    return tokenIds.map((id, i) => {
      const owner = reads[i * 2]?.result as string | undefined;
      const listing = reads[i * 2 + 1]?.result as any;
      const isListed = listing?.active === true;
      return {
        tokenId: Number(id),
        owner,
        isListed,
        price: isListed ? (listing.price as bigint) : null,
      };
    });
  }, [reads, tokenIds]);

  // Single-image collections: baseURI is the shared cover image
  const coverImage = baseURI && !String(baseURI).endsWith("/") ? resolveIPFSGateway(String(baseURI)) : "";

  if (minted === 0) {
    return (
      <div className="py-16 text-center border border-dashed border-grimoire-border rounded-2xl">
        <p className="text-grimoire-muted text-sm font-sans">No tokens minted yet.</p>
        <Link href={`/mint/${contractAddress}`} className="btn-primary inline-flex mt-4 text-xs px-4 py-2">Mint the first one</Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="story-panel aspect-square animate-pulse bg-grimoire-surface/40" />
        ))}
      </div>
    );
  }

  const forSaleCount = tokens.filter((t) => t.isListed).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 text-xs font-mono text-grimoire-muted">
        <span>{minted} minted</span>
        {forSaleCount > 0 && <span className="text-grimoire-purple-light">{forSaleCount} for sale</span>}
        {minted > scanCount && <span className="text-grimoire-muted/60">showing first {scanCount}</span>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {tokens.map((t) => (
          <Link
            key={t.tokenId}
            href={`/collection/${contractAddress}/token/${t.tokenId}`}
            className="story-panel overflow-hidden group hover:border-grimoire-purple/40 transition-all"
          >
            <div className="aspect-square overflow-hidden relative bg-grimoire-elevated">
              {coverImage ? (
                <img src={coverImage} alt={`#${t.tokenId}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-display text-3xl text-grimoire-purple-light/15">
                  #{t.tokenId}
                </div>
              )}
              {t.isListed && (
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-grimoire-purple text-white text-[9px] font-mono font-bold tracking-wider">
                  FOR SALE
                </div>
              )}
            </div>
            <div className="p-3">
              <div className="font-display text-white text-xs truncate">#{t.tokenId}</div>
              {t.isListed && t.price != null ? (
                <div className="text-[10px] font-mono text-grimoire-purple-light mt-0.5">{formatEther(t.price)} RITUAL</div>
              ) : (
                <div className="text-[10px] font-mono text-grimoire-muted mt-0.5">Not listed</div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

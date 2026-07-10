"use client";

// =============================================
// The Living Grimoire — Owned NFT discovery
// =============================================
// Discovers every NFT an address holds across factory-deployed
// collections, reading straight from Ritual Chain. Also surfaces
// each token's marketplace listing state.

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import type { Address } from "viem";
import {
  FACTORY_ADDRESS,
  NFTFactory_ABI,
  AIRitualNFT_ABI,
  MARKETPLACE_ADDRESS,
  RitualMarketplace_ABI,
} from "@/lib/contracts";

export interface OwnedNFT {
  contractAddress: Address;
  collectionName: string;
  symbol: string;
  baseURI: string;
  tokenId: number;
  isListed: boolean;
  price: bigint | null;
}

export function useOwnedNFTs(owner?: Address) {
  const publicClient = usePublicClient();
  const [nfts, setNfts] = useState<OwnedNFT[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!owner || !publicClient) {
      setNfts([]);
      return;
    }
    let cancelled = false;

    async function scan() {
      setIsLoading(true);
      const found: OwnedNFT[] = [];
      try {
        const collections = (await publicClient!.readContract({
          address: FACTORY_ADDRESS,
          abi: NFTFactory_ABI,
          functionName: "getAllCollections",
        })) as Address[];

        for (const collection of collections) {
          try {
            const [tokenIds, name, symbol, baseURI] = await Promise.all([
              publicClient!.readContract({ address: collection, abi: AIRitualNFT_ABI, functionName: "tokensOfOwner", args: [owner!] }) as Promise<bigint[]>,
              publicClient!.readContract({ address: collection, abi: AIRitualNFT_ABI, functionName: "name" }).catch(() => "Collection") as Promise<string>,
              publicClient!.readContract({ address: collection, abi: AIRitualNFT_ABI, functionName: "symbol" }).catch(() => "") as Promise<string>,
              publicClient!.readContract({ address: collection, abi: AIRitualNFT_ABI, functionName: "baseURI" }).catch(() => "") as Promise<string>,
            ]);

            if (!tokenIds.length) continue;

            // Listing state for each owned token
            const listings = await Promise.all(
              tokenIds.map((id) =>
                publicClient!
                  .readContract({ address: MARKETPLACE_ADDRESS, abi: RitualMarketplace_ABI, functionName: "getListing", args: [collection, id] })
                  .catch(() => null)
              )
            );

            tokenIds.forEach((id, i) => {
              const listing = listings[i] as any;
              const isListed = listing?.active === true;
              found.push({
                contractAddress: collection,
                collectionName: name as string,
                symbol: symbol as string,
                baseURI: baseURI as string,
                tokenId: Number(id),
                isListed,
                price: isListed ? (listing.price as bigint) : null,
              });
            });
          } catch {
            // Not an ERC721AQueryable collection — skip
          }
        }

        if (!cancelled) setNfts(found);
      } catch {
        if (!cancelled) setNfts([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    scan();
    return () => { cancelled = true; };
  }, [owner, publicClient]);

  return { nfts, isLoading };
}

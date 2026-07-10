// =============================================
// The Living Grimoire — Wallet NFT Scanner
// =============================================
// Scans a connected wallet for ERC-721 tokens on Ritual Chain
// Uses Transfer event logs to discover NFT holdings

"use client";

import { useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { type Address, parseAbiItem } from "viem";

/** Known ERC-721 contracts on Ritual Chain */
const KNOWN_CONTRACTS: { address: Address; name: string }[] = [
  {
    address: "0xb26e453CAF6EAa68248447052A0AC75a84650312",
    name: "The Mini Cauldron",
  },
  // Add more known contracts here as they get deployed
];

/** Minimal ABI for reading collection info */
const ERC721_READ_ABI = [
  {
    type: "function",
    name: "name",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "symbol",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalSupply",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "tokenOfOwnerByIndex",
    inputs: [
      { name: "owner", type: "address" },
      { name: "index", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

/** A discovered NFT collection the wallet holds */
export interface WalletCollection {
  contractAddress: string;
  name: string;
  symbol: string;
  balance: number;
  totalSupply: number;
  tokenIds: number[];
}

/**
 * Hook to scan the connected wallet for NFT holdings on Ritual Chain.
 * Checks known contracts + discovers new ones via Transfer logs.
 */
export function useWalletNFTs() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [collections, setCollections] = useState<WalletCollection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected || !address || !publicClient) {
      setCollections([]);
      return;
    }

    let cancelled = false;

    async function scan() {
      setIsLoading(true);
      setError(null);

      const found: WalletCollection[] = [];

      try {
        // 1. Check known contracts
        for (const known of KNOWN_CONTRACTS) {
          try {
            const balance = await publicClient!.readContract({
              address: known.address,
              abi: ERC721_READ_ABI,
              functionName: "balanceOf",
              args: [address!],
            });

            if (Number(balance) > 0) {
              let name = known.name;
              let symbol = "???";
              let totalSupply = 0;

              try {
                name = await publicClient!.readContract({
                  address: known.address,
                  abi: ERC721_READ_ABI,
                  functionName: "name",
                });
              } catch { /* use known name */ }

              try {
                symbol = await publicClient!.readContract({
                  address: known.address,
                  abi: ERC721_READ_ABI,
                  functionName: "symbol",
                });
              } catch { /* skip */ }

              try {
                const supply = await publicClient!.readContract({
                  address: known.address,
                  abi: ERC721_READ_ABI,
                  functionName: "totalSupply",
                });
                totalSupply = Number(supply);
              } catch { /* skip */ }

              // Try to get token IDs owned by this wallet
              const tokenIds: number[] = [];
              const bal = Number(balance);
              for (let i = 0; i < Math.min(bal, 20); i++) {
                try {
                  const tokenId = await publicClient!.readContract({
                    address: known.address,
                    abi: ERC721_READ_ABI,
                    functionName: "tokenOfOwnerByIndex",
                    args: [address!, BigInt(i)],
                  });
                  tokenIds.push(Number(tokenId));
                } catch {
                  // Contract might not support ERC721Enumerable
                  break;
                }
              }

              found.push({
                contractAddress: known.address,
                name,
                symbol,
                balance: bal,
                totalSupply,
                tokenIds,
              });
            }
          } catch {
            // Contract might not exist or be incompatible — skip
          }
        }

        // 2. Discover unknown contracts via Transfer event logs
        try {
          const transferEvent = parseAbiItem(
            "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
          );

          const logs = await publicClient!.getLogs({
            event: transferEvent,
            args: { to: address! },
            fromBlock: "earliest",
            toBlock: "latest",
          });

          // Group by contract address
          const contractMap = new Map<string, Set<number>>();
          for (const log of logs) {
            const addr = log.address.toLowerCase();
            // Skip already-known contracts
            if (KNOWN_CONTRACTS.some((k) => k.address.toLowerCase() === addr)) continue;

            if (!contractMap.has(addr)) {
              contractMap.set(addr, new Set());
            }
            if (log.args.tokenId !== undefined) {
              contractMap.get(addr)!.add(Number(log.args.tokenId));
            }
          }

          // Check each discovered contract
          for (const [contractAddr, tokenIdSet] of contractMap) {
            try {
              const balance = await publicClient!.readContract({
                address: contractAddr as Address,
                abi: ERC721_READ_ABI,
                functionName: "balanceOf",
                args: [address!],
              });

              if (Number(balance) > 0) {
                let name = "Unknown Collection";
                let symbol = "???";
                let totalSupply = 0;

                try {
                  name = await publicClient!.readContract({
                    address: contractAddr as Address,
                    abi: ERC721_READ_ABI,
                    functionName: "name",
                  });
                } catch { /* skip */ }

                try {
                  symbol = await publicClient!.readContract({
                    address: contractAddr as Address,
                    abi: ERC721_READ_ABI,
                    functionName: "symbol",
                  });
                } catch { /* skip */ }

                try {
                  const supply = await publicClient!.readContract({
                    address: contractAddr as Address,
                    abi: ERC721_READ_ABI,
                    functionName: "totalSupply",
                  });
                  totalSupply = Number(supply);
                } catch { /* skip */ }

                found.push({
                  contractAddress: contractAddr,
                  name,
                  symbol,
                  balance: Number(balance),
                  totalSupply,
                  tokenIds: [...tokenIdSet],
                });
              }
            } catch {
              // Not a valid ERC-721 — skip
            }
          }
        } catch (err) {
          console.warn("Transfer log scan failed (may not be supported):", err);
        }

        if (!cancelled) {
          setCollections(found);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to scan wallet. Please try again.");
          console.error("Wallet scan error:", err);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    scan();

    return () => {
      cancelled = true;
    };
  }, [address, isConnected, publicClient]);

  return { collections, isLoading, error, isConnected, address };
}

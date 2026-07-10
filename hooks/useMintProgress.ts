"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePublicClient, useWatchBlockNumber } from "wagmi";
import { NFT_ABI, NFT_CONTRACT_ADDRESS, MAX_SUPPLY } from "@/lib/contracts";

/**
 * useMintProgress — resilient totalSupply reader.
 *
 * Uses direct readContract + retry to handle intermittent RPC instability.
 *
 * FIX: Guarded window.setInterval behind typeof check to avoid SSR crash.
 * FIX: Removed duplicate 5s polling interval — useWatchBlockNumber already
 *      triggers a refresh on every new block; the interval is kept as a
 *      safety net but only starts client-side.
 */
export function useMintProgress() {
  const publicClient = usePublicClient();
  const [minted, setMinted] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const refresh = useCallback(async () => {
    if (!publicClient) return;

    setIsError(false);

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const supply = await publicClient.readContract({
          address: NFT_CONTRACT_ADDRESS,
          abi: NFT_ABI,
          functionName: "totalSupply",
        });

        setMinted(Number(supply));
        setIsLoading(false);
        return;
      } catch {
        if (attempt === 3) {
          setIsError(true);
          setIsLoading(false);
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }
  }, [publicClient]);

  // Initial fetch
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // 30s polling fallback — guard against SSR (window is undefined on server)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const id = window.setInterval(() => {
      void refresh();
    }, 30_000);

    return () => window.clearInterval(id);
  }, [refresh]);

  // Also refresh on every new block for near-real-time updates
  useWatchBlockNumber({
    onBlockNumber: () => {
      void refresh();
    },
  });

  const remaining = useMemo(() => Math.max(0, MAX_SUPPLY - minted), [minted]);
  const isSoldOut = minted >= MAX_SUPPLY;
  const progress = Math.min((minted / MAX_SUPPLY) * 100, 100);

  return {
    minted,
    remaining,
    isSoldOut,
    progress,
    isLoading,
    isError,
    refresh,
  };
}

export type MintProgressState = ReturnType<typeof useMintProgress>;

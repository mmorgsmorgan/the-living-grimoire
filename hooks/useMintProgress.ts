"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePublicClient, useWatchBlockNumber } from "wagmi";
import { NFT_ABI, NFT_CONTRACT_ADDRESS, MAX_SUPPLY } from "@/lib/contract";

/**
 * useMintProgress — resilient totalSupply reader.
 *
 * Uses direct readContract + retry to handle intermittent RPC instability.
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

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void refresh();
    }, 5000);

    return () => window.clearInterval(id);
  }, [refresh]);

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

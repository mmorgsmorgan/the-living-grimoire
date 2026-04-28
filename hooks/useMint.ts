"use client";

import { useAccount, usePublicClient, useSendTransaction } from "wagmi";
import { decodeEventLog, encodeFunctionData, parseEther } from "viem";
import { useState, useCallback } from "react";
import { toast } from "react-hot-toast";
import { NFT_ABI, NFT_CONTRACT_ADDRESS, MINT_PRICE_ETH, MAX_SUPPLY } from "@/lib/contract";
import { type MintedNft, resolveMintedNft } from "@/lib/nftMetadata";

/**
 * useMint — handles the NFT mint transaction lifecycle.
 *
 * Uses useSendTransaction (NOT useWriteContract) to skip eth_call simulation,
 * which ensures wallet interactions work correctly on Ritual Chain.
 *
 * States: idle → minting → confirming → success | error
 */
export type MintStatus = "idle" | "minting" | "confirming" | "success" | "error";

export function useMint({
  onSuccess,
  isSoldOut,
  hasMintedAlready,
}: {
  onSuccess?: (mintedNft?: MintedNft) => void;
  isSoldOut: boolean;
  hasMintedAlready: boolean;
}) {
  const { isConnected, address } = useAccount();
  const publicClient = usePublicClient();
  const [status, setStatus] = useState<MintStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [mintedNft, setMintedNft] = useState<MintedNft | null>(null);

  const { sendTransactionAsync } = useSendTransaction();

  const mint = useCallback(async () => {
    // Guard conditions
    if (!isConnected) {
      toast.error("Connect your wallet first.");
      return;
    }
    if (!address) {
      toast.error("Wallet address unavailable. Reconnect and try again.");
      return;
    }
    if (!publicClient) {
      toast.error("Public client unavailable. Refresh and try again.");
      return;
    }
    if (isSoldOut) {
      toast.error("Sold out! All 99 NFTs have been minted.");
      return;
    }
    if (hasMintedAlready) {
      toast.error("This wallet already minted its NFT.");
      return;
    }

    setStatus("minting");
    setErrorMessage(null);
    setMintedNft(null);
    const toastId = toast.loading("Waiting for wallet approval…");

    try {
      // Encode the mint() call — bypasses eth_call simulation (Ritual-safe pattern)
      const data = encodeFunctionData({
        abi: NFT_ABI,
        functionName: "mint",
        args: [],
      });

      // Send transaction with mint price as value
      const hash = await sendTransactionAsync({
        to: NFT_CONTRACT_ADDRESS,
        data,
        value: parseEther(MINT_PRICE_ETH),
        gas: BigInt(300_000),
      });

      setTxHash(hash);
      setStatus("confirming");
      toast.loading("Transaction submitted — waiting for confirmation…", { id: toastId });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      const transferLog = receipt.logs.find((log) => {
        try {
          const decoded = decodeEventLog({
            abi: NFT_ABI,
            data: log.data,
            topics: log.topics,
          });

          return (
            decoded.eventName === "Transfer" &&
            decoded.args.from === "0x0000000000000000000000000000000000000000" &&
            decoded.args.to?.toLowerCase() === address.toLowerCase()
          );
        } catch {
          return false;
        }
      });

      let resolvedMintedNft: MintedNft | undefined;

      if (transferLog) {
        try {
          const decoded = decodeEventLog({
            abi: NFT_ABI,
            data: transferLog.data,
            topics: transferLog.topics,
          });
          const tokenId = Number(decoded.args.tokenId);
          resolvedMintedNft = (await resolveMintedNft(publicClient, tokenId)) ?? undefined;
        } catch {
          // Mint can still succeed even if metadata resolution fails.
          // Keep a minimal token record so the UI can still enforce one mint per wallet
          // and recover full metadata in a follow-up on-chain read.
          try {
            const decoded = decodeEventLog({
              abi: NFT_ABI,
              data: transferLog.data,
              topics: transferLog.topics,
            });
            const tokenId = Number(decoded.args.tokenId);
            resolvedMintedNft = {
              tokenId,
              tokenURI: "",
              metadataURI: "",
              attributes: [],
            };
          } catch {
            resolvedMintedNft = undefined;
          }
        }
      }

      setMintedNft(resolvedMintedNft ?? null);
      onSuccess?.(resolvedMintedNft);
      setStatus("success");
      toast.success("🎉 NFT minted successfully!", { id: toastId, duration: 5000 });
    } catch (err: unknown) {
      setStatus("error");
      const message = parseError(err);
      setErrorMessage(message);
      toast.error(message, { id: toastId, duration: 6000 });
    }
  }, [address, hasMintedAlready, isConnected, isSoldOut, onSuccess, publicClient, sendTransactionAsync]);

  const reset = useCallback(() => {
    setStatus("idle");
    setErrorMessage(null);
    setTxHash(undefined);
    setMintedNft(null);
  }, []);

  return {
    mint,
    reset,
    status,
    txHash,
    mintedNft,
    errorMessage,
    isLoading: status === "minting" || status === "confirming",
  };
}

/** Parse common Web3 errors into user-friendly messages */
function parseError(err: unknown): string {
  if (typeof err !== "object" || err === null) return "An unknown error occurred.";

  const error = err as { code?: number | string; message?: string; details?: string };

  // User rejected
  if (
    error.code === 4001 ||
    error.message?.includes("User rejected") ||
    error.message?.includes("user rejected") ||
    error.message?.includes("denied")
  ) {
    return "Transaction rejected. You cancelled the transaction.";
  }

  // Insufficient funds
  if (
    error.message?.includes("insufficient funds") ||
    error.message?.includes("insufficient balance")
  ) {
    return `Insufficient funds. You need at least ${MINT_PRICE_ETH} RITUAL to mint.`;
  }

  // Sold out on-chain
  if (
    error.message?.includes("Sold out") ||
    error.message?.includes("Max supply") ||
    error.message?.includes("exceeds max")
  ) {
    return "Sold out — all NFTs have been minted.";
  }

  // Wrong network
  if (
    error.message?.includes("chain") ||
    error.message?.includes("network") ||
    error.message?.includes("1979")
  ) {
    return "Wrong network. Please switch to Ritual Chain (ID 1979).";
  }

  return error.details ?? error.message ?? "Transaction failed. Please try again.";
}

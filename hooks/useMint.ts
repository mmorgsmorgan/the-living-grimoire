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
 * which is the Ritual Chain-safe pattern for all contract writes.
 *
 * State machine: idle → minting → confirming → success | error
 *
 * FIX: Added AlreadyMinted error parsing (new custom error in contract).
 * FIX: Added check for revert on wrong chain with proper message.
 * FIX: reset() now also resets mintedNft state.
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
    // ── Guard conditions ──────────────────────────────────────────
    if (!isConnected) {
      toast.error("Connect your wallet first.");
      return;
    }
    if (!address) {
      toast.error("Wallet address unavailable. Reconnect and try again.");
      return;
    }
    if (!publicClient) {
      toast.error("RPC client unavailable. Refresh the page and try again.");
      return;
    }
    if (isSoldOut) {
      toast.error(`Sold out! All ${MAX_SUPPLY} NFTs have been minted.`);
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
      // Encode mint() call — bypasses eth_call simulation (Ritual-safe)
      const data = encodeFunctionData({
        abi: NFT_ABI,
        functionName: "mint",
        args: [],
      });

      const hash = await sendTransactionAsync({
        to: NFT_CONTRACT_ADDRESS,
        data,
        value: parseEther(MINT_PRICE_ETH),
        gas: BigInt(300_000),
      });

      setTxHash(hash);
      setStatus("confirming");
      toast.loading("Transaction submitted — waiting for confirmation…", { id: toastId });

      // Wait for on-chain confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      // Parse the Transfer event from the receipt to get tokenId
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

          const tokenId = Number((decoded.args as { tokenId: bigint }).tokenId);
          resolvedMintedNft = (await resolveMintedNft(publicClient, tokenId)) ?? undefined;
        } catch {
          // Metadata resolution failed — keep minimal record so the UI knows
          // which token was minted and can recover metadata in a follow-up read.
          try {
            const decoded = decodeEventLog({
              abi: NFT_ABI,
              data: transferLog.data,
              topics: transferLog.topics,
            });
            const tokenId = Number((decoded.args as { tokenId: bigint }).tokenId);
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
  }, [
    address,
    hasMintedAlready,
    isConnected,
    isSoldOut,
    onSuccess,
    publicClient,
    sendTransactionAsync,
  ]);

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

/** Parse common Web3 + contract errors into user-friendly messages */
function parseError(err: unknown): string {
  if (typeof err !== "object" || err === null) {
    return "An unknown error occurred.";
  }

  const error = err as {
    code?: number | string;
    message?: string;
    details?: string;
    shortMessage?: string;
  };

  const msg =
    error.shortMessage ??
    error.details ??
    error.message ??
    "";

  // User rejected / cancelled
  if (
    error.code === 4001 ||
    msg.includes("User rejected") ||
    msg.includes("user rejected") ||
    msg.includes("denied") ||
    msg.includes("cancelled") ||
    msg.includes("canceled")
  ) {
    return "Transaction cancelled. You rejected the request.";
  }

  // Insufficient funds
  if (msg.includes("insufficient funds") || msg.includes("insufficient balance")) {
    return `Insufficient funds. You need at least ${MINT_PRICE_ETH} RITUAL to mint.`;
  }

  // Already minted (new AlreadyMinted custom error)
  if (
    msg.includes("AlreadyMinted") ||
    msg.includes("already minted") ||
    msg.includes("Already minted")
  ) {
    return "This wallet has already minted its 1/1 NFT.";
  }

  // Sold out (SoldOut custom error)
  if (
    msg.includes("SoldOut") ||
    msg.includes("Sold out") ||
    msg.includes("Max supply") ||
    msg.includes("exceeds max")
  ) {
    return `Sold out — all ${MAX_SUPPLY} NFTs have been minted.`;
  }

  // Insufficient payment
  if (msg.includes("InsufficientPayment") || msg.includes("insufficient payment")) {
    return `Insufficient payment. Mint price is ${MINT_PRICE_ETH} RITUAL.`;
  }

  // Wrong network / chain
  if (
    msg.includes("wrong chain") ||
    msg.includes("wrong network") ||
    msg.includes("network changed") ||
    msg.includes("1979")
  ) {
    return "Wrong network. Please switch to Ritual Chain (ID 1979).";
  }

  // Gas estimation failure (often indicates a contract revert)
  if (msg.includes("gas") && msg.includes("estimat")) {
    return "Transaction would revert. Check your wallet balance and network.";
  }

  return msg || "Transaction failed. Please try again.";
}

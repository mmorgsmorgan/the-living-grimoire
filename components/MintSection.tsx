"use client";

import { useAccount, usePublicClient, useSwitchChain } from "wagmi";
import { toast } from "react-hot-toast";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ritualChain } from "@/lib/chain";
import { useMint } from "@/hooks/useMint";
import { type MintProgressState } from "@/hooks/useMintProgress";
import { MAX_SUPPLY, MINT_PRICE_ETH, NFT_ABI, NFT_CONTRACT_ADDRESS } from "@/lib/contract";
import { type MintedNft, resolveMintedNft } from "@/lib/nftMetadata";

/** MintSection — progress bar, mint button, stats panel */
export function MintSection({ mintProgress }: { mintProgress: MintProgressState }) {
  const { isConnected, chain, address } = useAccount();
  const publicClient = usePublicClient();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const isWrongChain = isConnected && chain?.id !== ritualChain.id;

  const { minted, remaining, isSoldOut, progress, isLoading: isProgressLoading, refresh } =
    mintProgress;

  const [walletMintedNft, setWalletMintedNft] = useState<MintedNft | null>(null);
  const [isWalletMintCheckLoading, setIsWalletMintCheckLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasMintedOnChain, setHasMintedOnChain] = useState(false);

  const hasMintedAlready = hasMintedOnChain || Boolean(walletMintedNft);

  const loadWalletMintState = useCallback(
    async (forceOpenModal: boolean) => {
      if (!address || !publicClient) {
        setWalletMintedNft(null);
        setIsModalOpen(false);
        setHasMintedOnChain(false);
        return;
      }

      setIsWalletMintCheckLoading(true);

      try {
        const mintedFlag = await readHasMintedWithRetry(publicClient, address);
        setHasMintedOnChain(mintedFlag);

        if (!mintedFlag) {
          setWalletMintedNft(null);
          setIsModalOpen(false);
          return;
        }

        const ownedTokenId = await resolveOwnedTokenId(publicClient, address);

        if (!ownedTokenId) {
          return;
        }

        const mintedNft = await resolveMintedNft(publicClient, ownedTokenId);
        if (!mintedNft) return;

        setWalletMintedNft(mintedNft);

        if (forceOpenModal) {
          setIsModalOpen(true);
        }
      } catch {
        // Ignore check failures; user can still interact with mint UI.
      } finally {
        setIsWalletMintCheckLoading(false);
      }
    },
    [address, publicClient]
  );

  const { mint, status, txHash, errorMessage, isLoading } = useMint({
    isSoldOut,
    hasMintedAlready,
    onSuccess: (mintedNft) => {
      if (mintedNft && address) {
        setWalletMintedNft(mintedNft);
        setIsModalOpen(true);
      }

      // Always re-hydrate from chain so modal shows real tokenURI metadata
      // (image + traits), even if first pass resolved only minimal data.
      setTimeout(() => {
        void loadWalletMintState(true);
      }, 1200);

      // Force several supply refreshes after mint confirmation to keep
      // counter/progress/recent mints in sync across RPC/indexing delays.
      void refresh();
      setTimeout(() => {
        void refresh();
      }, 1500);
      setTimeout(() => {
        void refresh();
      }, 3500);
      setTimeout(() => {
        void refresh();
      }, 7000);
    },
  });

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      await loadWalletMintState(true);
    };
    if (!ignore) {
      void run();
    }

    return () => {
      ignore = true;
    };
  }, [loadWalletMintState]);

  const downloadMintedNft = async () => {
    if (!walletMintedNft?.image) return;
    const response = await fetch(walletMintedNft.image);
    if (!response.ok) throw new Error("Could not download NFT image.");
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = `ritual-genesis-${walletMintedNft.tokenId}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  };

  const xShareUrl = useMemo(() => {
    if (!walletMintedNft) return "#";

    return `https://x.com/intent/tweet?text=${encodeURIComponent(
      `I just minted ${walletMintedNft.name ?? `Ritual Genesis #${walletMintedNft.tokenId}`} on Ritual Chain.`
    )}&url=${encodeURIComponent(`https://explorer.ritualfoundation.org/address/${NFT_CONTRACT_ADDRESS}`)}`;
  }, [walletMintedNft]);

  return (
    <>
      <section id="mint" className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <div className="bg-ritual-elevated border border-gray-800 rounded-2xl overflow-hidden shadow-card">
          <div className="h-1 w-full bg-gradient-to-r from-ritual-green via-ritual-lime to-ritual-green/30" />

          <div className="p-8 sm:p-10">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <img src="/ritual-logo.jpg" alt="Ritual Logo" className="w-6 h-6 object-contain" />
                  <h2 className="font-display text-white text-2xl">Mint Your NFT</h2>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <StatCard label="Mint Price" value={`${MINT_PRICE_ETH} RITUAL`} accent="green" />
                  <StatCard
                    label="Minted"
                    value={isProgressLoading ? "…" : `${minted} / ${MAX_SUPPLY}`}
                    accent={isSoldOut ? "red" : "lime"}
                  />
                  <StatCard label="Remaining" value={isProgressLoading ? "…" : `${remaining}`} />
                  <StatCard label="Per Wallet" value="1 NFT" />
                </div>

                <div className="space-y-3">
                  {!isConnected && <p className="text-sm text-gray-500 mb-2">Connect your wallet to mint.</p>}

                  {isWrongChain ? (
                    <button
                      id="switch-chain-btn"
                      onClick={() => switchChain({ chainId: ritualChain.id })}
                      disabled={isSwitching}
                      className="w-full py-4 text-base font-body font-semibold rounded-xl border border-ritual-gold/50 text-ritual-gold hover:bg-ritual-gold/10 transition-all duration-200 disabled:opacity-50"
                    >
                      {isSwitching ? "Switching…" : "⚠ Switch to Ritual Chain"}
                    </button>
                  ) : (
                    <button
                      id="mint-btn"
                      onClick={mint}
                      disabled={!isConnected || isSoldOut || isLoading || hasMintedAlready || isWalletMintCheckLoading}
                      className={`
                        w-full py-4 text-base font-body font-semibold rounded-xl border
                        transition-all duration-200 relative overflow-hidden
                        ${isSoldOut || hasMintedAlready
                          ? "border-gray-700 text-gray-600 cursor-not-allowed"
                          : isLoading || isWalletMintCheckLoading
                          ? "border-ritual-green/40 text-ritual-green/70 cursor-wait"
                          : !isConnected
                          ? "border-gray-700 text-gray-500 cursor-not-allowed"
                          : "border-ritual-green text-ritual-green hover:bg-ritual-green/10 hover:shadow-glow-green active:scale-[0.98]"
                        }
                      `}
                    >
                      {(isLoading || isWalletMintCheckLoading) && (
                        <span className="absolute inset-0 animate-shimmer pointer-events-none" />
                      )}

                      <span className="relative">
                        {isWalletMintCheckLoading
                          ? "Checking wallet…"
                          : hasMintedAlready
                          ? "Already Minted"
                          : isSoldOut
                          ? "✗ Sold Out"
                          : isLoading
                          ? status === "confirming"
                            ? "⟳ Confirming…"
                            : "⟳ Minting…"
                          : "Mint NFT →"}
                      </span>
                    </button>
                  )}

                  {hasMintedAlready && (
                    <p className="text-xs text-ritual-gold">This wallet has already minted its 1/1 NFT.</p>
                  )}

                  {txHash && (
                    <a
                      href={`https://explorer.ritualfoundation.org/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-center text-xs font-mono text-gray-500 hover:text-ritual-green transition-colors truncate"
                    >
                      TX: {txHash.slice(0, 20)}…{txHash.slice(-8)} ↗
                    </a>
                  )}

                  {errorMessage && status === "error" && (
                    <div
                      role="alert"
                      className="flex items-start gap-2 p-3 bg-red-500/5 border border-red-500/20 rounded-lg text-sm text-red-400"
                    >
                      <span className="mt-0.5">✗</span>
                      <span>{errorMessage}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="bg-black/40 border border-gray-800 rounded-xl p-6">
                  <div className="flex justify-between items-end mb-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Mint Progress</p>
                      <p className="font-display text-white text-3xl">
                        {isProgressLoading ? (
                          <span className="text-gray-600">…</span>
                        ) : (
                          <>
                            <span style={{ color: "#19D184" }}>{minted}</span>
                            <span className="text-gray-600 text-xl"> / {MAX_SUPPLY}</span>
                          </>
                        )}
                      </p>
                    </div>
                    <p className="text-2xl font-display text-gray-600">{isProgressLoading ? "" : `${Math.round(progress)}%`}</p>
                  </div>

                  <div
                    role="progressbar"
                    aria-valuenow={minted}
                    aria-valuemax={MAX_SUPPLY}
                    aria-label="Mint progress"
                    className="ritual-progress-track"
                  >
                    <div className="ritual-progress-fill" style={{ width: `${progress}%` }} />
                  </div>

                  <div className="flex justify-between mt-3 text-xs font-mono text-gray-600">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>

                  <div className="mt-6 flex items-center gap-2 text-xs text-gray-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-700 animate-pulse" />
                    Auto-refreshes every 30s
                  </div>

                  {isSoldOut && (
                    <div className="mt-4 p-3 bg-red-500/5 border border-red-500/20 rounded-lg text-center">
                      <span className="text-sm text-red-400 font-semibold">✗ Sold Out — All {MAX_SUPPLY} NFTs have been minted</span>
                    </div>
                  )}

                  <div className="mt-6 pt-4 border-t border-gray-800 space-y-2">
                    <InfoRow label="Contract">
                      <a
                        href={`https://explorer.ritualfoundation.org/address/${NFT_CONTRACT_ADDRESS}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-gray-500 hover:text-ritual-green transition-colors"
                      >
                        {NFT_CONTRACT_ADDRESS.slice(0, 10)}…
                        {NFT_CONTRACT_ADDRESS.slice(-8)} ↗
                      </a>
                    </InfoRow>
                    <InfoRow label="Network">
                      <span className="font-mono text-xs text-gray-400">Ritual Chain (1979)</span>
                    </InfoRow>
                    <InfoRow label="Standard">
                      <span className="font-mono text-xs text-gray-400">ERC-721</span>
                    </InfoRow>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {isModalOpen && walletMintedNft && (
        <div className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl bg-ritual-elevated border border-ritual-green/30 rounded-2xl overflow-hidden shadow-card">
            <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Your Minted NFT</p>
                <h3 className="text-white font-display text-xl">{walletMintedNft.name ?? `Ritual Genesis #${walletMintedNft.tokenId}`}</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800/50"
              >
                Close
              </button>
            </div>

            <div className="p-5 grid md:grid-cols-2 gap-5">
              {walletMintedNft.image ? (
                <img
                  src={walletMintedNft.image}
                  alt={walletMintedNft.name ?? `Ritual Genesis #${walletMintedNft.tokenId}`}
                  className="w-full rounded-xl border border-gray-800"
                />
              ) : (
                <div className="aspect-square rounded-xl border border-gray-800 bg-black/40 flex items-center justify-center text-gray-500">
                  Image unavailable
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Token ID</p>
                  <p className="text-white font-mono">#{walletMintedNft.tokenId}</p>
                </div>

                {walletMintedNft.attributes.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Traits</p>
                    <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1">
                      {walletMintedNft.attributes.map((trait) => (
                        <div
                          key={`${trait.trait_type}-${trait.value}`}
                          className="rounded-lg border border-gray-800 bg-black/40 px-3 py-2"
                        >
                          <p className="text-[11px] text-gray-500">{trait.trait_type}</p>
                          <p className="text-sm text-gray-200">{trait.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Traits unavailable for this metadata.</p>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    onClick={() => {
                      downloadMintedNft().catch(() => {
                        toast.error("Could not download image. Try again in a moment.");
                      });
                    }}
                    disabled={!walletMintedNft.image}
                    className="px-4 py-2 rounded-lg border border-ritual-green text-ritual-green hover:bg-ritual-green/10 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                  >
                    Download NFT
                  </button>
                  <a
                    href={xShareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-lg border border-gray-700 text-gray-200 hover:bg-gray-800/40 text-sm font-semibold"
                  >
                    Post on X
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

async function findOwnedTokenId(
  publicClient: NonNullable<ReturnType<typeof usePublicClient>>,
  walletAddress: `0x${string}`,
  totalSupply: number
): Promise<number | null> {
  for (let tokenId = 1; tokenId <= totalSupply; tokenId++) {
    try {
      const owner = await publicClient.readContract({
        address: NFT_CONTRACT_ADDRESS,
        abi: NFT_ABI,
        functionName: "ownerOf",
        args: [BigInt(tokenId)],
      });

      if (owner.toLowerCase() === walletAddress.toLowerCase()) {
        return tokenId;
      }
    } catch {
      // Skip tokens that revert or transient read errors.
    }
  }

  return null;
}

async function resolveOwnedTokenId(
  publicClient: NonNullable<ReturnType<typeof usePublicClient>>,
  walletAddress: `0x${string}`
): Promise<number | null> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const supply = await publicClient.readContract({
        address: NFT_CONTRACT_ADDRESS,
        abi: NFT_ABI,
        functionName: "totalSupply",
      });

      return await findOwnedTokenId(publicClient, walletAddress, Number(supply));
    } catch {
      if (attempt === 3) return null;
      await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
    }
  }

  return null;
}

async function readHasMintedWithRetry(
  publicClient: NonNullable<ReturnType<typeof usePublicClient>>,
  walletAddress: `0x${string}`
): Promise<boolean> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await publicClient.readContract({
        address: NFT_CONTRACT_ADDRESS,
        abi: NFT_ABI,
        functionName: "hasMinted",
        args: [walletAddress],
      });
    } catch {
      if (attempt === 3) return false;
      await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
    }
  }

  return false;
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "green" | "lime" | "red" | "gold";
}) {
  const colors = {
    green: "text-ritual-green",
    lime: "text-ritual-lime",
    red: "text-red-400",
    gold: "text-ritual-gold",
  };

  return (
    <div className="bg-black/30 border border-gray-800 rounded-xl p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p
        className={`font-body font-semibold text-base ${accent ? colors[accent] : "text-gray-300"}`}
      >
        {value}
      </p>
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-gray-600 uppercase tracking-wider">{label}</span>
      {children}
    </div>
  );
}

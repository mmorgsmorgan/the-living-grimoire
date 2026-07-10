"use client";

// =============================================
// The Living Grimoire — NFT Item Page
// =============================================
// Buy / List / Cancel a single NFT on the live RitualMarketplace,
// fused with the AI-generated Living World the token belongs to.
// All listing/ownership state is read directly from chain.

import { useParams } from "next/navigation";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { useState, useEffect } from "react";
import { formatEther } from "viem";
import Link from "next/link";
import { MARKETPLACE_ADDRESS, RitualMarketplace_ABI, AIRitualNFT_ABI } from "@/lib/contracts";
import { resolveIPFSGateway } from "@/lib/pinata";
import { fetchLore, shortenAddress, type WorldDetail } from "@/lib/api";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const NFT_ABI = [
  ...AIRitualNFT_ABI,
  { inputs: [], name: "name", outputs: [{ name: "", type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "symbol", outputs: [{ name: "", type: "string" }], stateMutability: "view", type: "function" },
] as const;

const OWNER_ABI = [{
  inputs: [{ name: "tokenId", type: "uint256" }],
  name: "ownerOf",
  outputs: [{ name: "", type: "address" }],
  stateMutability: "view",
  type: "function",
}] as const;

const TOKEN_URI_ABI = [{
  inputs: [{ name: "tokenId", type: "uint256" }],
  name: "tokenURI",
  outputs: [{ name: "", type: "string" }],
  stateMutability: "view",
  type: "function",
}] as const;

export default function ItemPage() {
  const params = useParams();
  const contractAddress = params.id as `0x${string}`;
  const tokenId = BigInt(params.tokenId as string);
  const { address: connectedWallet } = useAccount();

  const [localMeta, setLocalMeta] = useState<{ image?: string; name?: string; description?: string } | null>(null);
  const [tokenMeta, setTokenMeta] = useState<{ name?: string; description?: string; image?: string } | null>(null);
  const [world, setWorld] = useState<WorldDetail | null>(null);
  const [listPrice, setListPrice] = useState("");

  // Locally cached collection metadata (saved at deploy time)
  useEffect(() => {
    if (!contractAddress) return;
    try {
      const saved = localStorage.getItem(`grimoire_meta_${contractAddress.toLowerCase()}`);
      if (saved) setLocalMeta(JSON.parse(saved));
    } catch {}
  }, [contractAddress]);

  // The Living World this NFT belongs to
  useEffect(() => {
    if (!contractAddress) return;
    fetchLore(contractAddress).then(setWorld).catch(() => {});
  }, [contractAddress]);

  // ── On-chain reads ──────────────────────────────────────────
  const { data: colName } = useReadContract({ address: contractAddress, abi: NFT_ABI, functionName: "name" });
  const { data: symbol } = useReadContract({ address: contractAddress, abi: NFT_ABI, functionName: "symbol" });
  const { data: onChainBaseURI } = useReadContract({ address: contractAddress, abi: NFT_ABI, functionName: "baseURI" });
  const { data: tokenURIData } = useReadContract({ address: contractAddress, abi: TOKEN_URI_ABI, functionName: "tokenURI", args: [tokenId] });
  const { data: owner, refetch: refetchOwner } = useReadContract({ address: contractAddress, abi: OWNER_ABI, functionName: "ownerOf", args: [tokenId] });

  const { data: listing, refetch: refetchListing } = useReadContract({
    address: MARKETPLACE_ADDRESS,
    abi: RitualMarketplace_ABI,
    functionName: "getListing",
    args: [contractAddress, tokenId],
  });

  const { data: isApproved } = useReadContract({
    address: contractAddress,
    abi: AIRitualNFT_ABI,
    functionName: "isApprovedForAll",
    args: [connectedWallet as `0x${string}`, MARKETPLACE_ADDRESS],
    query: { enabled: !!connectedWallet },
  });

  // Fetch per-token metadata JSON from IPFS (multi-image collections)
  useEffect(() => {
    const uri = tokenURIData as string;
    if (!uri) return;
    const gateway = resolveIPFSGateway(uri);
    if (!gateway) return;
    fetch(gateway)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => { if (json) setTokenMeta(json); })
      .catch(() => {});
  }, [tokenURIData]);

  // ── Derived state ───────────────────────────────────────────
  const collectionName = colName?.toString() || localMeta?.name || shortenAddress(contractAddress);
  const nftName = tokenMeta?.name || `${collectionName} #${tokenId.toString()}`;
  const nftDescription = tokenMeta?.description || localMeta?.description || "";
  const rawImage = tokenMeta?.image || localMeta?.image || (onChainBaseURI as string) || "";
  const imageUrl = rawImage ? resolveIPFSGateway(rawImage) : "";
  const ownerAddress = (owner as string) ?? "";
  const isOwner = ownerAddress?.toLowerCase() === connectedWallet?.toLowerCase();
  const listingData = listing as any;
  const isListed = listingData?.active === true;

  // ── Write flows ─────────────────────────────────────────────
  const { writeContract: buyWrite, data: buyTx, isPending: buyPending } = useWriteContract();
  const { isLoading: buyConfirming, isSuccess: buySuccess } = useWaitForTransactionReceipt({ hash: buyTx });

  const { writeContract: approveWrite, data: approveTx, isPending: approvePending } = useWriteContract();
  const { isLoading: approveConfirming, isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveTx });

  const { writeContract: listWrite, data: listTx, isPending: listPending } = useWriteContract();
  const { isLoading: listConfirming, isSuccess: listSuccess } = useWaitForTransactionReceipt({ hash: listTx });

  const { writeContract: cancelWrite, data: cancelTx, isPending: cancelPending } = useWriteContract();
  const { isLoading: cancelConfirming, isSuccess: cancelSuccess } = useWaitForTransactionReceipt({ hash: cancelTx });

  useEffect(() => {
    if (buySuccess || listSuccess || cancelSuccess || approveSuccess) {
      refetchOwner();
      refetchListing();
    }
  }, [buySuccess, listSuccess, cancelSuccess, approveSuccess, refetchOwner, refetchListing]);

  function handleBuy() {
    buyWrite({
      address: MARKETPLACE_ADDRESS, abi: RitualMarketplace_ABI, functionName: "buy",
      args: [contractAddress, tokenId], value: BigInt(listingData.price), gas: BigInt(300000),
    });
  }

  function handleApprove() {
    approveWrite({
      address: contractAddress, abi: AIRitualNFT_ABI, functionName: "setApprovalForAll",
      args: [MARKETPLACE_ADDRESS, true], gas: BigInt(100000),
    });
  }

  function handleList() {
    if (!listPrice || parseFloat(listPrice) <= 0) return;
    const priceWei = BigInt(Math.floor(parseFloat(listPrice) * 1e18));
    listWrite({
      address: MARKETPLACE_ADDRESS, abi: RitualMarketplace_ABI, functionName: "list",
      args: [contractAddress, tokenId, priceWei], gas: BigInt(200000),
    });
  }

  function handleCancel() {
    cancelWrite({
      address: MARKETPLACE_ADDRESS, abi: RitualMarketplace_ABI, functionName: "cancelListing",
      args: [contractAddress, tokenId], gas: BigInt(100000),
    });
  }

  // Try to find a character from the world to feature alongside this token
  const featuredCharacter = world?.lore?.characters?.[Number(tokenId) % (world.lore.characters.length || 1)];

  return (
    <main className="min-h-screen flex flex-col grimoire-mesh">
      <Navbar />

      <div className="pt-16 flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs font-mono mb-8 text-grimoire-muted">
            <Link href="/explore" className="hover:text-grimoire-purple-light transition-colors">Explore</Link>
            <span>→</span>
            <Link href={`/collection/${contractAddress}`} className="hover:text-grimoire-purple-light transition-colors">{collectionName}</Link>
            <span>→</span>
            <span className="text-grimoire-purple-light">#{tokenId.toString()}</span>
          </div>

          <div className="grid md:grid-cols-2 gap-10 items-start">
            {/* Left — Image + description */}
            <div className="space-y-5">
              <div className="rounded-2xl overflow-hidden aspect-square story-panel">
                {imageUrl ? (
                  <img src={imageUrl} alt={nftName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-grimoire-elevated">
                    <div className="font-display text-6xl text-grimoire-purple-light/10">
                      {symbol?.toString().slice(0, 2) ?? "??"}
                    </div>
                    <p className="text-[10px] text-grimoire-muted">No image</p>
                  </div>
                )}
              </div>

              {nftDescription && (
                <div className="story-panel p-5">
                  <div className="text-[10px] font-mono font-bold tracking-widest mb-2 text-grimoire-muted uppercase">Description</div>
                  <p className="text-sm leading-relaxed text-grimoire-ink font-body">{nftDescription}</p>
                </div>
              )}
            </div>

            {/* Right — Details + marketplace actions */}
            <div className="space-y-6">
              <div>
                <Link href={`/collection/${contractAddress}`} className="text-xs font-mono tracking-widest mb-2 block text-grimoire-muted hover:text-grimoire-purple-light transition-colors">
                  {collectionName} · {symbol?.toString()}
                </Link>
                <h1 className="font-display text-white text-4xl">{nftName}</h1>
              </div>

              {/* Owner */}
              <div className="story-panel p-5">
                <div className="text-[10px] font-mono font-bold tracking-widest mb-2 text-grimoire-muted uppercase">Owner</div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs bg-grimoire-purple text-white">
                    {ownerAddress?.slice(2, 4)?.toUpperCase() || "??"}
                  </div>
                  <div>
                    <Link href={`/profile/${ownerAddress}`} className="font-mono text-sm font-bold text-grimoire-purple-light hover:underline">
                      {ownerAddress ? shortenAddress(ownerAddress) : "Loading..."}
                    </Link>
                    {isOwner && <div className="text-[10px] font-bold text-grimoire-muted">YOU</div>}
                  </div>
                </div>
              </div>

              {/* Price / Buy / List / Cancel */}
              {buySuccess ? (
                <div className="story-panel p-6 text-center space-y-3 border-grimoire-purple/30">
                  <div className="font-display text-xl text-white">Purchased</div>
                  <p className="text-xs text-grimoire-muted">This artifact is now yours.</p>
                  <a href={`https://explorer.ritualfoundation.org/tx/${buyTx}`} target="_blank" rel="noopener noreferrer" className="btn-primary text-xs px-5 py-2.5 inline-block">View on Explorer</a>
                </div>
              ) : isListed ? (
                <div className="story-panel p-6 space-y-4 border-grimoire-purple/20">
                  <div className="text-[10px] font-mono font-bold tracking-widest text-grimoire-muted uppercase">Listed For Sale</div>
                  <div className="font-display text-4xl text-white">
                    {formatEther(BigInt(listingData.price))} RITUAL
                  </div>
                  {isOwner ? (
                    <button onClick={handleCancel} disabled={cancelPending || cancelConfirming}
                      className="w-full py-3 rounded-xl text-xs font-bold tracking-wider bg-grimoire-crimson/10 text-grimoire-crimson border border-grimoire-crimson/20 hover:bg-grimoire-crimson/20 transition-colors disabled:opacity-50">
                      {cancelPending || cancelConfirming ? "CANCELLING..." : "CANCEL LISTING"}
                    </button>
                  ) : (
                    <button onClick={handleBuy} disabled={buyPending || buyConfirming || !connectedWallet}
                      className="btn-primary w-full py-3.5 text-sm font-bold disabled:opacity-50">
                      {!connectedWallet ? "Connect Wallet to Buy" : buyPending || buyConfirming ? "BUYING..." : "BUY NOW"}
                    </button>
                  )}
                </div>
              ) : isOwner ? (
                <div className="story-panel p-6 space-y-4">
                  <div className="text-[10px] font-mono font-bold tracking-widest text-grimoire-muted uppercase">List For Sale</div>
                  {isApproved ? (
                    <>
                      <input
                        type="number" step="0.001" placeholder="Price in RITUAL"
                        value={listPrice} onChange={(e) => setListPrice(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl text-sm font-mono bg-grimoire-surface border border-grimoire-border text-white focus:border-grimoire-purple outline-none"
                      />
                      <button onClick={handleList} disabled={listPending || listConfirming || !listPrice}
                        className="btn-primary w-full py-3 text-xs font-bold disabled:opacity-50">
                        {listSuccess ? "LISTED" : listPending || listConfirming ? "LISTING..." : "LIST NOW"}
                      </button>
                    </>
                  ) : (
                    <button onClick={handleApprove} disabled={approvePending || approveConfirming}
                      className="btn-primary w-full py-3 text-xs font-bold disabled:opacity-50">
                      {approvePending || approveConfirming ? "APPROVING..." : "APPROVE MARKETPLACE"}
                    </button>
                  )}
                </div>
              ) : (
                <div className="story-panel p-5">
                  <div className="text-sm text-grimoire-muted">Not listed for sale</div>
                </div>
              )}

              {/* Lore link — this NFT's place in the Living World */}
              {world?.lore && (
                <div className="story-panel p-5 space-y-3 border-grimoire-gold/20">
                  <div className="text-[10px] font-mono font-bold tracking-widest text-grimoire-gold/70 uppercase">From the Living World</div>
                  {featuredCharacter ? (
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-display text-white/80 shrink-0"
                        style={{ background: `linear-gradient(135deg, hsl(${featuredCharacter.imageHue},50%,20%), hsl(${(featuredCharacter.imageHue + 40) % 360},40%,15%))` }}>
                        {featuredCharacter.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-display text-white text-sm">{featuredCharacter.name}</p>
                        <p className="text-grimoire-purple-light text-[10px] font-sans uppercase tracking-wider">{featuredCharacter.role}</p>
                        <p className="text-grimoire-muted text-xs font-body mt-1 line-clamp-2">{featuredCharacter.backstory}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-grimoire-ink text-sm font-body line-clamp-3">{world.lore.lore?.origin}</p>
                  )}
                  <Link href={`/collection/${contractAddress}`} className="block text-xs font-mono text-grimoire-gold/70 hover:text-grimoire-gold transition-colors">
                    Explore the full world →
                  </Link>
                </div>
              )}

              {/* Token facts */}
              <div className="story-panel p-5 space-y-3">
                <div className="text-[10px] font-mono font-bold tracking-widest text-grimoire-muted uppercase">Details</div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Contract", value: shortenAddress(contractAddress) },
                    { label: "Token ID", value: `#${tokenId.toString()}` },
                  ].map((r) => (
                    <div key={r.label} className="flex justify-between py-2 px-3 rounded-xl bg-grimoire-surface">
                      <span className="text-[10px] font-bold text-grimoire-muted">{r.label}</span>
                      <span className="text-xs font-bold font-mono text-grimoire-ink">{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}

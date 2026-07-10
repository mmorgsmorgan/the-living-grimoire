"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatEther } from "viem";
import { AIRitualNFT_ABI } from "@/lib/contracts";
import { resolveIPFSGateway, uploadToPinata } from "@/lib/pinata";
import { fetchMerkleProof } from "@/lib/api";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const NFT_ABI = [
  ...AIRitualNFT_ABI,
  { inputs: [], name: "name", outputs: [{ name: "", type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "symbol", outputs: [{ name: "", type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "owner", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalSupply", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "baseURI", outputs: [{ name: "", type: "string" }], stateMutability: "view", type: "function" },
] as const;

type Phase = {
  startTime: bigint;
  endTime: bigint;
  price: bigint;
  maxPerWallet: number;
  merkleRoot: `0x${string}`;
  isPublic: boolean;
};

export default function MintPage() {
  const params = useParams();
  const contractAddress = params.address as `0x${string}`;
  const { address: userAddress } = useAccount();
  const [quantity, setQuantity] = useState(1);
  const [now, setNow] = useState(Math.floor(Date.now()));
  const [localMeta, setLocalMeta] = useState<{ name?: string; image?: string; description?: string } | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(Math.floor(Date.now())), 1000);
    return () => clearInterval(interval);
  }, []);

  // Load locally cached metadata (saved at deploy time)
  useEffect(() => {
    if (!contractAddress) return;
    try {
      const saved = localStorage.getItem(`grimoire_meta_${contractAddress.toLowerCase()}`);
      if (saved) setLocalMeta(JSON.parse(saved));
    } catch {}
  }, [contractAddress]);

  const { data: name } = useReadContract({ address: contractAddress, abi: NFT_ABI, functionName: "name" });
  const { data: symbol } = useReadContract({ address: contractAddress, abi: NFT_ABI, functionName: "symbol" });
  const { data: maxSupply, isLoading: maxLoading, isError: maxError } = useReadContract({ address: contractAddress, abi: NFT_ABI, functionName: "maxSupply" });
  const { data: totalSupplyRaw } = useReadContract({ address: contractAddress, abi: NFT_ABI, functionName: "totalSupply" });
  const { data: totalPhases, isLoading: phasesQueryLoading, isError: phasesError } = useReadContract({ address: contractAddress, abi: NFT_ABI, functionName: "totalPhases" });
  const { data: onChainBaseURI } = useReadContract({ address: contractAddress, abi: NFT_ABI, functionName: "baseURI" });

  const { data: phase0 } = useReadContract({ address: contractAddress, abi: AIRitualNFT_ABI, functionName: "getPhase", args: [BigInt(0)] });
  const { data: phase1 } = useReadContract({ address: contractAddress, abi: AIRitualNFT_ABI, functionName: "getPhase", args: [BigInt(1)], query: { enabled: (totalPhases ?? BigInt(0)) > BigInt(1) } });

  const phases: Phase[] = [phase0, phase1].filter(Boolean) as Phase[];
  const activePhaseIdx = phases.findIndex(p => now >= Number(p.startTime) && now <= Number(p.endTime));
  const activePhase = activePhaseIdx >= 0 ? phases[activePhaseIdx] : null;
  const upcomingPhase = phases.find(p => now < Number(p.startTime));
  const endedPhase = phases.length > 0 ? phases.reduce((a, b) => (Number(a.endTime) > Number(b.endTime) ? a : b)) : null;

  // Distinguish "still loading from chain" from "genuinely no phase" so the
  // mint card never silently sits on a blank Loading state — and never shows
  // a scary error while reads are simply still in flight.
  const contractReadFailed = (maxError || phasesError) && maxSupply === undefined && totalPhases === undefined;
  const phasesLoading = maxLoading || phasesQueryLoading || totalPhases === undefined || (Number(totalPhases ?? 0) > 0 && phases.length === 0);
  const allPhasesEnded = phases.length > 0 && !activePhase && !upcomingPhase;

  // Check wallet mints in active phase
  const { data: mintedByUser } = useReadContract({
    address: contractAddress,
    abi: AIRitualNFT_ABI,
    functionName: "mintedPerWalletPerPhase",
    args: [BigInt(Math.max(activePhaseIdx, 0)), userAddress!],
    query: { enabled: !!userAddress && activePhaseIdx >= 0 },
  });
  const alreadyMinted = Number(mintedByUser ?? BigInt(0));
  const remainingAllowance = activePhase ? Math.max(0, activePhase.maxPerWallet - alreadyMinted) : 0;
  const walletLimitReached = activePhase ? alreadyMinted >= activePhase.maxPerWallet : false;

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // ── Owner controls: revive an ended/absent mint phase ─────────
  const { data: ownerAddr } = useReadContract({ address: contractAddress, abi: NFT_ABI, functionName: "owner" });
  const isOwner = !!userAddress && !!ownerAddr && (ownerAddr as string).toLowerCase() === userAddress.toLowerCase();
  const { writeContract: adminWrite, data: adminTx, isPending: adminPending } = useWriteContract();
  const { isLoading: adminConfirming, isSuccess: adminSuccess } = useWaitForTransactionReceipt({ hash: adminTx });

  // Extend the last public phase (or phase 0) to run for N more days from now.
  function handleExtend(days: number) {
    const now = Date.now();
    const end = now + days * 24 * 3600 * 1000;
    // Find a public phase to extend; default to phase 0.
    const idx = phases.findIndex((p) => p.isPublic);
    const targetIdx = idx >= 0 ? idx : 0;
    adminWrite({
      address: contractAddress, abi: AIRitualNFT_ABI, functionName: "setPhaseTime",
      args: [BigInt(targetIdx), BigInt(now), BigInt(end)], gas: BigInt(120000),
    });
  }

  // Add a brand-new public phase (for collections whose phases can't be reused).
  function handleAddPublicPhase(days: number, priceEth: string) {
    const now = Date.now();
    const end = now + days * 24 * 3600 * 1000;
    adminWrite({
      address: contractAddress, abi: AIRitualNFT_ABI, functionName: "addPhase",
      args: [{
        startTime: BigInt(now),
        endTime: BigInt(end),
        price: BigInt(Math.floor(parseFloat(priceEth || "0") * 1e18)),
        maxPerWallet: 10,
        merkleRoot: "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
        isPublic: true,
      }],
      gas: BigInt(200000),
    });
  }

  // Owner: upload artwork to IPFS and set it on-chain as the collection image.
  const [imgUploading, setImgUploading] = useState(false);
  async function handleSetImage(file: File) {
    setImgUploading(true);
    try {
      const ipfsUrl = await uploadToPinata(file); // returns ipfs://<cid>
      adminWrite({
        address: contractAddress, abi: AIRitualNFT_ABI, functionName: "setBaseURI",
        args: [ipfsUrl], gas: BigInt(120000),
      });
      // Cache locally so it shows immediately even before the tx settles.
      try {
        const prev = JSON.parse(localStorage.getItem(`grimoire_meta_${contractAddress.toLowerCase()}`) || "{}");
        localStorage.setItem(`grimoire_meta_${contractAddress.toLowerCase()}`, JSON.stringify({ ...prev, image: ipfsUrl }));
      } catch {}
    } catch (err) {
      console.error("Image upload failed:", err);
      alert("Image upload failed. Please try again.");
    } finally {
      setImgUploading(false);
    }
  }

  async function handleMint() {
    if (!activePhase || !userAddress) return;
    const totalCost = activePhase.price * BigInt(quantity);
    if (activePhase.isPublic) {
      writeContract({
        address: contractAddress,
        abi: AIRitualNFT_ABI,
        functionName: "publicMint",
        args: [BigInt(activePhaseIdx), BigInt(quantity)],
        value: totalCost,
        gas: BigInt(200000),
      });
    } else {
      let proof: `0x${string}`[] = [];
      try {
        const merkleRoot = activePhase.merkleRoot;
        const result = await fetchMerkleProof(merkleRoot, userAddress);
        if (!result.valid) {
          alert("Your wallet is not on the allowlist for this phase.");
          return;
        }
        proof = result.proof as `0x${string}`[];
      } catch (err) {
        console.error("Failed to fetch Merkle proof:", err);
        alert("Could not verify allowlist status. Please try again.");
        return;
      }
      writeContract({
        address: contractAddress,
        abi: AIRitualNFT_ABI,
        functionName: "allowlistMint",
        args: [BigInt(activePhaseIdx), BigInt(quantity), proof],
        value: totalCost,
        gas: BigInt(200000),
      });
    }
  }

  const supplyBig = maxSupply ?? BigInt(0);
  const rawMintedBig = totalSupplyRaw ?? BigInt(0);
  // ERC721A proxy clones: totalSupply underflows if constructor didn't run
  const mintedBig = (supplyBig > BigInt(0) && rawMintedBig > supplyBig) ? BigInt(0) : rawMintedBig;
  const minted = Number(mintedBig);
  const supply = Number(supplyBig);
  const isSoldOut = supply > 0 && minted >= supply;
  const progress = supply > 0 ? (minted / supply) * 100 : 0;

  // Image: prefer locally cached, fall back to on-chain baseURI
  const rawImage = localMeta?.image || (onChainBaseURI as string) || "";
  const imageUrl = rawImage ? resolveIPFSGateway(rawImage) : "";

  function formatCountdown(targetTs: number): string {
    const diffMs = targetTs - now;
    if (diffMs <= 0) return "Live now";
    const diffSec = Math.floor(diffMs / 1000);
    const h = Math.floor(diffSec / 3600);
    const m = Math.floor((diffSec % 3600) / 60);
    const s = diffSec % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  return (
    <main className="min-h-screen flex flex-col grimoire-mesh">
      <Navbar />

      <div className="pt-16 flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid md:grid-cols-2 gap-10 items-start">

            {/* Left — Image + Phases */}
            <div className="space-y-4">
              <div className="rounded-2xl overflow-hidden aspect-square story-panel">
                {imageUrl ? (
                  <img src={imageUrl} alt={name as string} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-grimoire-elevated">
                    <div className="font-display text-6xl text-grimoire-purple-light/10">
                      {symbol?.toString().slice(0, 2) ?? "??"}
                    </div>
                    <p className="text-[10px] text-grimoire-muted">No image cached</p>
                  </div>
                )}
              </div>

              {/* Phases Timeline */}
              {phases.length > 0 && (
                <div className="story-panel p-5 space-y-3">
                  <div className="text-xs font-mono font-bold tracking-widest text-grimoire-muted uppercase">Phases</div>
                  {phases.map((p, i) => {
                    const isActive = now >= Number(p.startTime) && now <= Number(p.endTime);
                    const isPast = now > Number(p.endTime);
                    const isFuture = now < Number(p.startTime);
                    return (
                      <div key={i} className={`flex items-center gap-4 p-3 rounded-xl transition-all border ${
                        isActive
                          ? "bg-grimoire-purple/10 border-grimoire-purple/30"
                          : "bg-grimoire-surface border-grimoire-border"
                      }`}>
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          isActive ? "bg-grimoire-purple-light" : isPast ? "bg-grimoire-muted/30" : "bg-grimoire-muted/10"
                        }`} />
                        <div className="flex-1">
                          <div className={`text-xs font-mono font-bold ${
                            isActive ? "text-grimoire-purple-light" : "text-grimoire-muted"
                          }`}>
                            {p.isPublic ? "PUBLIC SALE" : "ALLOWLIST"}{isActive ? " -- LIVE" : isPast ? " -- ENDED" : ""}
                          </div>
                          <div className="text-[10px] mt-0.5 text-grimoire-muted">
                            {formatEther(p.price)} RITUAL -- max {p.maxPerWallet}/wallet
                            {isFuture && ` -- starts in ${formatCountdown(Number(p.startTime))}`}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right — Mint card */}
            <div className="space-y-6">
              <div>
                <div className="text-xs font-mono tracking-widest mb-2 text-grimoire-muted">
                  {contractAddress.slice(0, 6)}...{contractAddress.slice(-4)}
                </div>
                <h1 className="font-display text-white text-4xl">
                  {(name as string | undefined) || localMeta?.name || "Loading..."}
                </h1>
                <p className="text-sm font-mono mt-1 text-grimoire-muted">{symbol?.toString()}</p>
                {localMeta?.description && (
                  <p className="text-sm mt-3 text-grimoire-muted">{localMeta.description}</p>
                )}
              </div>

              {/* Progress */}
              <div className="story-panel p-5 space-y-3">
                <div className="flex justify-between text-xs font-mono font-bold">
                  <span className="text-grimoire-muted">MINTED</span>
                  <span className="text-grimoire-purple-light">{minted} / {supply}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden bg-grimoire-surface">
                  <div className="h-full rounded-full transition-all bg-grimoire-purple" style={{ width: `${Math.min(progress, 100)}%` }} />
                </div>
                <div className="text-[10px] text-grimoire-muted">
                  {isSoldOut ? "SOLD OUT" : `${(100 - progress).toFixed(1)}% remaining`}
                </div>
              </div>

              {/* Mint interface */}
              {isSuccess ? (
                <div className="story-panel p-6 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-grimoire-purple/20 border border-grimoire-purple/40 flex items-center justify-center mx-auto">
                    <svg className="w-6 h-6 text-grimoire-purple-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="font-display text-xl text-white">Minted Successfully</div>
                  <p className="text-xs text-grimoire-muted">You minted {quantity} token{quantity > 1 ? "s" : ""}</p>
                  <a href={`https://explorer.ritualfoundation.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                    className="btn-primary text-xs px-5 py-2.5 inline-block">View on Explorer</a>
                </div>
              ) : isSoldOut ? (
                <div className="story-panel p-6 text-center">
                  <div className="font-display text-xl text-grimoire-muted">SOLD OUT</div>
                </div>
              ) : walletLimitReached ? (
                <div className="story-panel p-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-grimoire-purple/20 border border-grimoire-purple/40 flex items-center justify-center mx-auto">
                    <svg className="w-6 h-6 text-grimoire-purple-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="font-display text-xl text-white">Wallet Limit Reached</div>
                  <p className="text-xs text-grimoire-muted">
                    You have minted {alreadyMinted}/{activePhase?.maxPerWallet} in this phase
                  </p>
                </div>
              ) : activePhase ? (
                <div className="story-panel p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-mono font-bold tracking-widest text-grimoire-muted">
                        {activePhase.isPublic ? "PUBLIC SALE" : "ALLOWLIST"} -- LIVE
                      </div>
                      <div className="font-display text-2xl text-white mt-1">
                        {formatEther(activePhase.price)} RITUAL
                      </div>
                      <div className="text-xs mt-0.5 text-grimoire-muted">
                        per token -- {alreadyMinted}/{activePhase.maxPerWallet} minted by you
                      </div>
                    </div>
                    <div className="text-xs text-right text-grimoire-muted">
                      Ends in<br />
                      <span className="font-mono font-bold text-grimoire-purple-light">
                        {formatCountdown(Number(activePhase.endTime))}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-mono font-bold tracking-widest mb-2 text-grimoire-muted">
                      QUANTITY <span className="text-grimoire-muted/50">({remainingAllowance} remaining)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-10 h-10 rounded-xl font-bold text-lg transition-all bg-grimoire-surface border border-grimoire-border text-grimoire-purple-light hover:border-grimoire-purple/40">-</button>
                      <div className="flex-1 text-center font-display text-2xl text-white">{quantity}</div>
                      <button onClick={() => setQuantity(Math.min(remainingAllowance, quantity + 1))}
                        className="w-10 h-10 rounded-xl font-bold text-lg transition-all bg-grimoire-surface border border-grimoire-border text-grimoire-purple-light hover:border-grimoire-purple/40">+</button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 rounded-xl bg-grimoire-surface">
                    <span className="text-xs font-mono font-bold text-grimoire-muted">TOTAL</span>
                    <span className="font-display text-xl text-white">
                      {(parseFloat(formatEther(activePhase.price)) * quantity).toFixed(4)} RITUAL
                    </span>
                  </div>

                  <button onClick={handleMint} disabled={!userAddress || isPending || isConfirming || remainingAllowance === 0}
                    className="btn-primary w-full py-4 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed">
                    {!userAddress ? "Connect Wallet to Mint" : isPending ? "Confirm in Wallet..." : isConfirming ? "Minting..." : `Mint ${quantity} Token${quantity > 1 ? "s" : ""}`}
                  </button>
                </div>
              ) : upcomingPhase ? (
                <div className="story-panel p-6 text-center space-y-3">
                  <div className="text-xs font-mono font-bold tracking-widest text-grimoire-muted">MINT STARTS IN</div>
                  <div className="font-display text-3xl text-white">
                    {formatCountdown(Number(upcomingPhase.startTime))}
                  </div>
                  <div className="text-xs text-grimoire-muted">
                    {upcomingPhase.isPublic ? "Public Sale" : "Allowlist"} -- {formatEther(upcomingPhase.price)} RITUAL
                  </div>
                </div>
              ) : contractReadFailed ? (
                <div className="story-panel p-6 text-center space-y-2">
                  <div className="font-display text-xl text-grimoire-muted">Couldn&apos;t reach the contract</div>
                  <p className="text-xs text-grimoire-muted">
                    This collection isn&apos;t responding on Ritual Chain. Check your wallet network, then refresh.
                  </p>
                </div>
              ) : phasesLoading ? (
                <div className="story-panel p-6 text-center space-y-3">
                  <div className="w-6 h-6 border-2 border-grimoire-purple border-t-transparent rounded-full animate-spin mx-auto" />
                  <div className="text-xs text-grimoire-muted font-mono">Reading mint phases…</div>
                </div>
              ) : allPhasesEnded ? (
                <div className="story-panel p-6 text-center space-y-2">
                  <div className="font-display text-xl text-grimoire-muted">Minting Has Ended</div>
                  {endedPhase && (
                    <p className="text-xs text-grimoire-muted">
                      The mint window closed {formatCountdown(Number(endedPhase.endTime)) === "Live now" ? "just now" : "on " + new Date(Number(endedPhase.endTime)).toLocaleString()}.
                    </p>
                  )}
                  {isOwner && <p className="text-[11px] text-grimoire-gold/70 font-mono">You own this — reopen it below.</p>}
                </div>
              ) : (
                <div className="story-panel p-6 text-center space-y-2">
                  <div className="font-display text-xl text-grimoire-muted">No Mint Phase Set</div>
                  <p className="text-xs text-grimoire-muted">This collection has no mint phase configured.</p>
                  {isOwner && <p className="text-[11px] text-grimoire-gold/70 font-mono">You own this — add a phase below.</p>}
                </div>
              )}

              {/* Owner controls — revive an ended or missing mint phase */}
              {isOwner && (
                <div className="story-panel p-5 space-y-3 border-grimoire-gold/20">
                  <div className="text-[10px] font-mono font-bold tracking-widest text-grimoire-gold/70 uppercase">
                    Owner Controls
                  </div>

                  {/* Set collection image on-chain (fixes "No image cached") */}
                  {!imageUrl && (
                    <div className="space-y-2 pb-3 border-b border-grimoire-border/40">
                      <p className="text-[11px] text-grimoire-muted font-sans">
                        This collection has no image. Set one so buyers see the artwork.
                      </p>
                      <input type="file" accept="image/*" id="owner-set-image" className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleSetImage(e.target.files[0])} />
                      <label htmlFor="owner-set-image"
                        className="block w-full text-center py-2 rounded-xl text-[11px] font-bold tracking-wider border border-grimoire-gold/30 text-grimoire-gold hover:bg-grimoire-gold/10 transition-colors cursor-pointer">
                        {imgUploading ? "UPLOADING TO IPFS..." : "SET COLLECTION IMAGE"}
                      </label>
                    </div>
                  )}

                  <p className="text-[11px] text-grimoire-muted font-sans">
                    {activePhase
                      ? "Your mint is live. You can still extend it."
                      : "No active phase. Reopen minting for buyers."}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleExtend(7)}
                      disabled={adminPending || adminConfirming}
                      className="py-2 rounded-xl text-[11px] font-bold tracking-wider bg-grimoire-surface border border-grimoire-border text-grimoire-purple-light hover:border-grimoire-purple/40 transition-colors disabled:opacity-50"
                    >
                      {adminPending || adminConfirming ? "..." : "EXTEND 7 DAYS"}
                    </button>
                    <button
                      onClick={() => handleExtend(30)}
                      disabled={adminPending || adminConfirming}
                      className="py-2 rounded-xl text-[11px] font-bold tracking-wider bg-grimoire-surface border border-grimoire-border text-grimoire-purple-light hover:border-grimoire-purple/40 transition-colors disabled:opacity-50"
                    >
                      {adminPending || adminConfirming ? "..." : "EXTEND 30 DAYS"}
                    </button>
                  </div>
                  <button
                    onClick={() => handleAddPublicPhase(30, activePhase ? formatEther(activePhase.price) : "0.02")}
                    disabled={adminPending || adminConfirming}
                    className="w-full py-2 rounded-xl text-[11px] font-bold tracking-wider border border-grimoire-gold/30 text-grimoire-gold hover:bg-grimoire-gold/10 transition-colors disabled:opacity-50"
                  >
                    {adminPending || adminConfirming ? "WORKING..." : "ADD NEW 30-DAY PUBLIC PHASE"}
                  </button>
                  {adminSuccess && (
                    <p className="text-[11px] text-grimoire-teal font-mono">Done — refresh to see the updated phase.</p>
                  )}
                </div>
              )}

              {/* Link to world lore */}
              <a href={`/collection/${contractAddress}`}
                className="block text-center text-xs font-mono text-grimoire-purple-light/60 hover:text-grimoire-purple-light transition-colors">
                View World Lore &rarr;
              </a>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}

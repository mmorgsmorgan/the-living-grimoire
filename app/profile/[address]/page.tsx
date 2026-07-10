"use client";

// =============================================
// The Living Grimoire — Profile / My NFTs
// =============================================
// Shows every NFT an address owns across factory collections, with
// a "Listed" filter for active marketplace listings. Selling and
// cancelling happen on each token's item page.

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useAccount } from "wagmi";
import { formatEther } from "viem";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useOwnedNFTs, type OwnedNFT } from "@/hooks/useOwnedNFTs";
import { resolveIPFSGateway } from "@/lib/pinata";
import { shortenAddress } from "@/lib/api";

type Tab = "owned" | "listed";

function NFTCard({ nft }: { nft: OwnedNFT }) {
  const cover = nft.baseURI && !nft.baseURI.endsWith("/") ? resolveIPFSGateway(nft.baseURI) : "";
  return (
    <Link
      href={`/collection/${nft.contractAddress}/token/${nft.tokenId}`}
      className="story-panel overflow-hidden group hover:border-grimoire-purple/40 transition-all"
    >
      <div className="aspect-square overflow-hidden relative bg-grimoire-elevated">
        {cover ? (
          <img src={cover} alt={`#${nft.tokenId}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-display text-3xl text-grimoire-purple-light/15">
            {nft.symbol?.slice(0, 2) || "#"}
          </div>
        )}
        {nft.isListed && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-grimoire-purple text-white text-[9px] font-mono font-bold tracking-wider">
            LISTED
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="font-display text-white text-xs truncate">{nft.collectionName} #{nft.tokenId}</div>
        {nft.isListed && nft.price != null ? (
          <div className="text-[10px] font-mono text-grimoire-purple-light mt-0.5">{formatEther(nft.price)} RITUAL</div>
        ) : (
          <div className="text-[10px] font-mono text-grimoire-muted mt-0.5">Tap to sell</div>
        )}
      </div>
    </Link>
  );
}

export default function ProfilePage() {
  const params = useParams();
  const address = params.address as `0x${string}`;
  const { address: connected } = useAccount();
  const isSelf = connected?.toLowerCase() === address?.toLowerCase();
  const [tab, setTab] = useState<Tab>("owned");

  const { nfts, isLoading } = useOwnedNFTs(address);
  const listed = useMemo(() => nfts.filter((n) => n.isListed), [nfts]);
  const shown = tab === "owned" ? nfts : listed;

  return (
    <main className="min-h-screen flex flex-col grimoire-mesh">
      <Navbar />

      <div className="pt-16 flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-display text-lg text-white bg-grimoire-purple">
              {address?.slice(2, 4)?.toUpperCase()}
            </div>
            <div>
              <h1 className="font-display text-white text-2xl">{isSelf ? "Your Collection" : "Collector"}</h1>
              <p className="font-mono text-xs text-grimoire-muted">{shortenAddress(address || "")}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-grimoire-border mb-8">
            {([["owned", `Owned (${nfts.length})`], ["listed", `Listed (${listed.length})`]] as [Tab, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-4 py-3 text-sm font-sans font-medium transition-all ${tab === key ? "tab-active" : "tab-inactive"}`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="story-panel aspect-square animate-pulse bg-grimoire-surface/40" />
              ))}
            </div>
          ) : shown.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {shown.map((nft) => (
                <NFTCard key={`${nft.contractAddress}-${nft.tokenId}`} nft={nft} />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center border border-dashed border-grimoire-border rounded-2xl">
              <p className="text-grimoire-muted text-sm font-sans mb-4">
                {tab === "owned" ? "No NFTs found in this wallet." : "No active listings."}
              </p>
              {isSelf && tab === "owned" && (
                <Link href="/explore" className="btn-primary inline-flex text-xs px-4 py-2">Explore collections to mint</Link>
              )}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  );
}

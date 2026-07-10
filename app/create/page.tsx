"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from "wagmi";
import { isAddress, parseEther, zeroHash, decodeEventLog } from "viem";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { FACTORY_ADDRESS, NFTFactory_ABI } from "@/lib/contracts";
import { uploadToPinata, uploadMetadataFolderToPinata, resolveIPFSGateway } from "@/lib/pinata";
import { generateMerkleRoot, saveLore } from "@/lib/api";
import { useWalletNFTs } from "@/hooks/useWalletNFTs";

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const STEPS = [
  { num: 1, label: "TYPE" },
  { num: 2, label: "DETAILS" },
  { num: 3, label: "EARNINGS" },
  { num: 4, label: "SCHEDULE" },
  { num: 5, label: "REVIEW" },
];

export default function CreatePage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { collections: walletNFTs, isLoading: scanningWallet } = useWalletNFTs();

  const [step, setStep] = useState<Step>(1);

  // Step 1 — Type
  const [collectionType] = useState<"erc721a">("erc721a");

  // Step 2 — Details
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [maxSupply, setMaxSupply] = useState("1000");
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState("");

  // Multi-image mode
  const [imageMode, setImageMode] = useState<"single" | "multi">("single");
  const [multiImages, setMultiImages] = useState<{ file: File; preview: string; cid?: string }[]>([]);
  const [uploadProgress, setUploadProgress] = useState("");

  // Step 3 — Earnings
  const [royaltyFee, setRoyaltyFee] = useState("5");
  const [royaltyRecipient, setRoyaltyRecipient] = useState("");

  // Step 4 — Schedule
  const [mintDate, setMintDate] = useState("");
  const [mintTime, setMintTime] = useState("");
  const [gtdEnabled, setGtdEnabled] = useState(false);
  const [gtdPrice, setGtdPrice] = useState("0.01");
  const [gtdMax, setGtdMax] = useState("3");
  const [gtdDurDays, setGtdDurDays] = useState("1");
  const [pubPrice, setPubPrice] = useState("0.02");
  const [pubMax, setPubMax] = useState("5");
  const [pubDurDays, setPubDurDays] = useState("30");
  const [allowlistCSV, setAllowlistCSV] = useState("");
  const [merkleRoot, setMerkleRoot] = useState<`0x${string}`>(zeroHash);
  const [csvFile, setCsvFile] = useState<string>("");

  // Deploy
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({ hash: txHash });

  // Step 6 — Lore generation
  const [loreStatus, setLoreStatus] = useState<"idle" | "generating" | "done" | "error">("idle");
  const [loreProgress, setLoreProgress] = useState(0);
  const [worldId, setWorldId] = useState("");

  // Parse deployed collection address from logs
  const deployedCollection = (() => {
    if (!receipt?.logs) return null;
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: [{
            type: "event", name: "CollectionCreated",
            inputs: [
              { name: "owner", type: "address", indexed: true },
              { name: "collection", type: "address", indexed: true },
              { name: "name", type: "string", indexed: false },
              { name: "symbol", type: "string", indexed: false },
              { name: "maxSupply", type: "uint256", indexed: false },
              { name: "timestamp", type: "uint256", indexed: false },
            ],
          }],
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === "CollectionCreated") {
          return (decoded.args as any).collection as `0x${string}`;
        }
      } catch { /* skip */ }
    }
    return null;
  })();

  // Move to step 6 when deploy succeeds + cache the collection's cover
  // image/name so mint, gallery, and item pages can render artwork.
  useEffect(() => {
    if (isSuccess && deployedCollection && step === 5) {
      try {
        localStorage.setItem(
          `grimoire_meta_${deployedCollection.toLowerCase()}`,
          JSON.stringify({
            name,
            description,
            image: imageMode === "single" ? imageUrl : (multiImages[0]?.cid || ""),
          })
        );
      } catch {}
      setStep(6);
    }
  }, [isSuccess, deployedCollection, step, name, description, imageUrl, imageMode, multiImages]);

  // ── Handlers ────────────────────────────────────────────────

  async function handleImageUpload(file: File) {
    setImageUploading(true);
    setImageError("");
    setImagePreview(URL.createObjectURL(file));
    try {
      const ipfsUrl = await uploadToPinata(file);
      setImageUrl(ipfsUrl);
    } catch (err) {
      console.error("Upload failed:", err);
      setImageError((err as Error).message || "Image upload failed. Please try again.");
      setImagePreview("");
    }
    setImageUploading(false);
  }

  async function handleMultiImageUpload(files: FileList) {
    const newImages = Array.from(files).map(f => ({
      file: f,
      preview: URL.createObjectURL(f),
    }));
    setMultiImages(prev => [...prev, ...newImages]);
  }

  function getStartTimestamp(): number {
    if (mintDate && mintTime) {
      const s = new Date(`${mintDate}T${mintTime}`).getTime();
      if (s > Date.now()) return Math.floor(s);
    }
    return Math.floor(Date.now());
  }

  function getScheduleLabel(): string {
    if (!mintDate || !mintTime) return "Starts immediately on deploy";
    const scheduled = new Date(`${mintDate}T${mintTime}`);
    if (scheduled <= new Date()) return "Starts immediately (time in the past)";
    const d = scheduled.getTime() - Date.now();
    return `Mint starts in ${Math.floor(d / 3600000)}h ${Math.floor((d % 3600000) / 60000)}m`;
  }

  async function handleMerkle() {
    const addrs = allowlistCSV.split(/[,\n\r]+/).map(a => a.trim()).filter(a => isAddress(a));
    if (!addrs.length) return;
    try {
      const r = await generateMerkleRoot(addrs);
      setMerkleRoot(r.root as `0x${string}`);
    } catch { /* silent */ }
  }

  function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvFile(file.name);
      const lines = text.split("\n").slice(1);
      const addrs = lines.map(l => l.split(",")[0]?.trim()).filter(a => a ? isAddress(a) : false);
      setAllowlistCSV(addrs.join("\n"));
    };
    reader.readAsText(file);
  }

  async function handleDeploy() {
    if (!address) return;

    // Guard: a collection with no image deploys an empty baseURI, which
    // leaves every NFT imageless. Require artwork before deploying.
    if (imageMode === "single" && !imageUrl) {
      alert("Please upload a cover image before deploying — otherwise your NFTs will have no artwork.");
      setStep(2);
      return;
    }
    if (imageMode === "multi" && multiImages.length === 0) {
      alert("Please add at least one NFT image before deploying.");
      setStep(2);
      return;
    }

    const start = getStartTimestamp();
    const gtdMs = parseFloat(gtdDurDays) * 24 * 3600 * 1000;
    const pubMs = parseFloat(pubDurDays) * 24 * 3600 * 1000;
    const recipient = royaltyRecipient || address;

    let finalBaseURI = imageUrl || "";

    // Multi-image: upload all images then create metadata folder
    if (imageMode === "multi" && multiImages.length > 0) {
      setUploadProgress("Uploading images to IPFS...");
      const uploaded: { tokenId: number; name: string; description: string; imageCID: string }[] = [];
      for (let i = 0; i < multiImages.length; i++) {
        setUploadProgress(`Uploading image ${i + 1} of ${multiImages.length}...`);
        let cid = multiImages[i].cid;
        if (!cid) {
          cid = await uploadToPinata(multiImages[i].file);
        }
        uploaded.push({ tokenId: i + 1, name: `${name} #${i + 1}`, description, imageCID: cid });
      }
      setUploadProgress("Creating metadata folder...");
      finalBaseURI = await uploadMetadataFolderToPinata(uploaded);
      setUploadProgress("");
    }

    const phases = [];
    if (gtdEnabled) {
      phases.push({ startTime: BigInt(start), endTime: BigInt(start + gtdMs), price: parseEther(gtdPrice), maxPerWallet: +gtdMax, merkleRoot, isPublic: false });
      phases.push({ startTime: BigInt(start + gtdMs), endTime: BigInt(start + gtdMs + pubMs), price: parseEther(pubPrice), maxPerWallet: +pubMax, merkleRoot: zeroHash, isPublic: true });
    } else {
      phases.push({ startTime: BigInt(start), endTime: BigInt(start + pubMs), price: parseEther(pubPrice), maxPerWallet: +pubMax, merkleRoot: zeroHash, isPublic: true });
    }

    writeContract({
      address: FACTORY_ADDRESS, abi: NFTFactory_ABI, functionName: "createCollection",
      args: [name, symbol, finalBaseURI, BigInt(imageMode === "multi" ? multiImages.length : maxSupply), recipient as `0x${string}`,
        BigInt(Math.round(parseFloat(royaltyFee) * 100)),
        phases],
      gas: BigInt(1500000),
    });
  }

  async function handleGenerateLore() {
    if (!deployedCollection) return;
    setLoreStatus("generating");
    setLoreProgress(10);

    try {
      setLoreProgress(30);
      const res = await fetch("/api/generate-world", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractAddress: deployedCollection,
          chainId: 1979,
          genre: "fantasy",
          tone: "epic",
        }),
      });

      setLoreProgress(70);

      if (!res.ok) {
        throw new Error(`Generation failed: ${res.status}`);
      }

      const data = await res.json();
      setWorldId(data.worldId || data.id || "");
      setLoreProgress(100);
      setLoreStatus("done");
    } catch (err) {
      console.error("Lore generation error:", err);
      setLoreStatus("error");
    }
  }

  const canNext = () => {
    if (step === 1) return true;
    if (step === 2) return name && symbol;
    if (step === 3) return true;
    if (step === 4) return true;
    return true;
  };

  // ── Not Connected ───────────────────────────────────────────

  if (!isConnected) {
    return (
      <main className="min-h-screen flex flex-col grimoire-mesh">
        <Navbar />
        <div className="pt-16 flex-1 flex items-center justify-center">
          <div className="text-center px-4">
            <h1 className="font-display text-white text-3xl mb-3">Connect Wallet</h1>
            <p className="text-grimoire-muted text-sm font-sans">
              Connect your wallet to deploy an NFT collection on Ritual Chain.
            </p>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  // ── Main Render ─────────────────────────────────────────────

  return (
    <main className="min-h-screen flex flex-col grimoire-mesh">
      <Navbar />

      <div className="pt-16 flex-1">
        <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-12 pb-24">
          {/* Header */}
          <div className="mb-10">
            <p className="text-xs text-grimoire-purple-light uppercase tracking-widest font-mono mb-2">Deploy</p>
            <h1 className="font-display text-white text-3xl sm:text-4xl mb-2">
              Deploy a Collection
            </h1>
            <p className="text-grimoire-muted text-sm font-sans">
              Deploy an ERC-721A NFT collection on Ritual Chain, then generate a Living World with AI.
            </p>
          </div>

          {/* Progress Steps */}
          {step <= 5 && (
            <div className="flex items-center gap-2 mb-10">
              {STEPS.map((s, i) => (
                <div key={s.num} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono border transition-colors ${
                    step >= s.num
                      ? "bg-grimoire-purple/20 border-grimoire-purple text-grimoire-purple-light"
                      : "bg-grimoire-surface border-grimoire-border text-grimoire-muted"
                  }`}>
                    {s.num}
                  </div>
                  <span className={`text-[10px] font-mono tracking-wider hidden sm:inline ${
                    step >= s.num ? "text-grimoire-purple-light" : "text-grimoire-muted"
                  }`}>{s.label}</span>
                  {i < STEPS.length - 1 && <div className="w-6 sm:w-10 h-px bg-grimoire-border" />}
                </div>
              ))}
            </div>
          )}

          {/* Wallet Collections */}
          {step === 1 && walletNFTs.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-grimoire-purple animate-pulse" />
                <h3 className="font-display text-white text-sm">Your Existing Collections</h3>
                {scanningWallet && <span className="text-[10px] font-mono text-grimoire-muted animate-pulse">Scanning...</span>}
              </div>
              <div className="grid gap-2">
                {walletNFTs.map((nft) => (
                  <a
                    key={nft.contractAddress}
                    href={`/collection/${nft.contractAddress}`}
                    className="story-panel p-3 text-left hover:border-grimoire-purple/40 transition-all flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-grimoire-purple/20 to-grimoire-gold/20 border border-grimoire-border flex items-center justify-center text-xs font-mono shrink-0">
                      NFT
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-display text-white text-xs truncate">{nft.name}</h4>
                      <p className="text-grimoire-muted text-[10px] font-mono truncate">{nft.contractAddress}</p>
                    </div>
                    <span className="text-grimoire-purple-light text-[10px] font-mono shrink-0">View</span>
                  </a>
                ))}
              </div>
              <div className="h-px bg-grimoire-border my-6" />
            </div>
          )}

          {/* ── Step 1: Type ── */}
          {step === 1 && (
            <div className="story-panel p-8 space-y-6">
              <h2 className="font-display text-white text-lg">Collection Type</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <button
                  className="p-5 rounded-xl border-2 border-grimoire-purple text-left bg-grimoire-purple/5"
                >
                  <p className="font-display text-white text-sm mb-1">ERC-721A</p>
                  <p className="text-grimoire-muted text-xs font-sans">Gas-optimized NFT standard. Each token is unique.</p>
                </button>
                <button
                  disabled
                  className="p-5 rounded-xl border border-grimoire-border text-left opacity-40 cursor-not-allowed"
                >
                  <p className="font-display text-white text-sm mb-1">ERC-1155</p>
                  <p className="text-grimoire-muted text-xs font-sans">Multi-token standard. Coming soon.</p>
                </button>
              </div>
              <button
                className="w-full py-3 rounded-xl bg-grimoire-purple text-white font-display text-sm tracking-wider hover:bg-grimoire-purple/80 transition-colors"
                onClick={() => setStep(2)}
              >
                NEXT: DETAILS
              </button>
            </div>
          )}

          {/* ── Step 2: Details ── */}
          {step === 2 && (
            <div className="story-panel p-8 space-y-6">
              <h2 className="font-display text-white text-lg">Collection Details</h2>
              <Field label="COLLECTION NAME" value={name} onChange={setName} placeholder="My Collection" />
              <Field label="SYMBOL" value={symbol} onChange={setSymbol} placeholder="MYCOL" />
              <Field label="DESCRIPTION" value={description} onChange={setDescription} placeholder="A brief description of your collection..." />

              {/* Image mode toggle */}
              <div>
                <label className="block text-xs text-grimoire-muted uppercase tracking-wider font-mono mb-2">IMAGE MODE</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setImageMode("single")}
                    className={`px-4 py-2 rounded-lg text-xs font-mono border transition-colors ${
                      imageMode === "single" ? "border-grimoire-purple text-grimoire-purple-light bg-grimoire-purple/10" : "border-grimoire-border text-grimoire-muted"
                    }`}
                  >Single Image</button>
                  <button
                    onClick={() => setImageMode("multi")}
                    className={`px-4 py-2 rounded-lg text-xs font-mono border transition-colors ${
                      imageMode === "multi" ? "border-grimoire-purple text-grimoire-purple-light bg-grimoire-purple/10" : "border-grimoire-border text-grimoire-muted"
                    }`}
                  >Multi Image</button>
                </div>
              </div>

              {/* Single image upload */}
              {imageMode === "single" && (
                <div>
                  <label className="block text-xs text-grimoire-muted uppercase tracking-wider font-mono mb-2">COVER IMAGE</label>
                  <div className="border border-dashed border-grimoire-border rounded-xl p-6 text-center">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-32 h-32 mx-auto rounded-lg object-cover mb-3" />
                    ) : (
                      <div className="w-32 h-32 mx-auto rounded-lg bg-grimoire-surface border border-grimoire-border flex items-center justify-center mb-3">
                        <span className="text-grimoire-muted text-xs font-mono">No image</span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                      className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload" className="cursor-pointer text-xs font-mono text-grimoire-purple-light hover:underline">
                      {imageUploading ? "Uploading to IPFS..." : "Choose file"}
                    </label>
                    {imageUrl && <p className="text-[10px] font-mono text-grimoire-teal mt-2 truncate">✓ {imageUrl}</p>}
                    {imageError && <p className="text-[11px] font-sans text-red-400 mt-2 leading-relaxed">{imageError}</p>}
                  </div>
                </div>
              )}

              {/* Multi image upload */}
              {imageMode === "multi" && (
                <div>
                  <label className="block text-xs text-grimoire-muted uppercase tracking-wider font-mono mb-2">
                    NFT IMAGES ({multiImages.length} uploaded)
                  </label>
                  <div className="border border-dashed border-grimoire-border rounded-xl p-6">
                    {multiImages.length > 0 && (
                      <div className="grid grid-cols-6 gap-2 mb-4">
                        {multiImages.slice(0, 12).map((img, i) => (
                          <img key={i} src={img.preview} alt={`#${i + 1}`} className="w-full aspect-square rounded-lg object-cover" />
                        ))}
                        {multiImages.length > 12 && (
                          <div className="w-full aspect-square rounded-lg bg-grimoire-surface border border-grimoire-border flex items-center justify-center">
                            <span className="text-grimoire-muted text-[10px] font-mono">+{multiImages.length - 12}</span>
                          </div>
                        )}
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => e.target.files && handleMultiImageUpload(e.target.files)}
                      className="hidden"
                      id="multi-upload"
                    />
                    <label htmlFor="multi-upload" className="cursor-pointer text-xs font-mono text-grimoire-purple-light hover:underline block text-center">
                      Add images
                    </label>
                  </div>
                </div>
              )}

              <Field label="MAX SUPPLY" value={maxSupply} onChange={setMaxSupply} type="number" />

              <div className="flex gap-3">
                <button className="flex-1 py-3 rounded-xl border border-grimoire-border text-grimoire-muted font-display text-sm hover:bg-grimoire-surface transition-colors" onClick={() => setStep(1)}>BACK</button>
                <button className="flex-1 py-3 rounded-xl bg-grimoire-purple text-white font-display text-sm tracking-wider hover:bg-grimoire-purple/80 transition-colors disabled:opacity-40" onClick={() => setStep(3)} disabled={!name || !symbol}>NEXT: EARNINGS</button>
              </div>
            </div>
          )}

          {/* ── Step 3: Earnings ── */}
          {step === 3 && (
            <div className="story-panel p-8 space-y-6">
              <h2 className="font-display text-white text-lg">Earnings</h2>
              <Field label="ROYALTY %" value={royaltyFee} onChange={setRoyaltyFee} type="number" placeholder="5" />
              <Field label="ROYALTY RECIPIENT (leave blank for your wallet)" value={royaltyRecipient} onChange={setRoyaltyRecipient} placeholder="0x..." />
              <div className="flex gap-3">
                <button className="flex-1 py-3 rounded-xl border border-grimoire-border text-grimoire-muted font-display text-sm hover:bg-grimoire-surface transition-colors" onClick={() => setStep(2)}>BACK</button>
                <button className="flex-1 py-3 rounded-xl bg-grimoire-purple text-white font-display text-sm tracking-wider hover:bg-grimoire-purple/80 transition-colors" onClick={() => setStep(4)}>NEXT: SCHEDULE</button>
              </div>
            </div>
          )}

          {/* ── Step 4: Schedule ── */}
          {step === 4 && (
            <div className="story-panel p-8 space-y-7">
              <div>
                <h2 className="font-display text-white text-lg">Mint Schedule</h2>
                <p className="text-grimoire-muted text-xs font-sans mt-1">
                  Two simple choices: <span className="text-grimoire-ink">when minting opens</span> and{" "}
                  <span className="text-grimoire-ink">how long it stays open</span>.
                </p>
              </div>

              {/* ── When does minting start? ── */}
              <div className="space-y-3">
                <label className="block text-xs text-grimoire-purple-light uppercase tracking-wider font-mono">1 · When does minting start?</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => { setMintDate(""); setMintTime(""); }}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      !mintDate ? "border-grimoire-purple bg-grimoire-purple/10" : "border-grimoire-border hover:border-grimoire-purple/40"
                    }`}
                  >
                    <p className="font-display text-white text-sm">Right away</p>
                    <p className="text-grimoire-muted text-[11px] font-sans mt-0.5">Opens the moment you deploy.</p>
                  </button>
                  <button
                    onClick={() => { if (!mintDate) { const d = new Date(Date.now() + 3600000); setMintDate(d.toISOString().slice(0, 10)); setMintTime(d.toTimeString().slice(0, 5)); } }}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      mintDate ? "border-grimoire-purple bg-grimoire-purple/10" : "border-grimoire-border hover:border-grimoire-purple/40"
                    }`}
                  >
                    <p className="font-display text-white text-sm">Schedule it</p>
                    <p className="text-grimoire-muted text-[11px] font-sans mt-0.5">Pick a future date & time.</p>
                  </button>
                </div>
                {mintDate && (
                  <div className="grid sm:grid-cols-2 gap-4 pt-1">
                    <Field label="START DATE" value={mintDate} onChange={setMintDate} type="date" />
                    <Field label="START TIME" value={mintTime} onChange={setMintTime} type="time" />
                  </div>
                )}
              </div>

              <div className="h-px bg-grimoire-border" />

              {/* ── How long does it run? ── */}
              <div className="space-y-3">
                <label className="block text-xs text-grimoire-purple-light uppercase tracking-wider font-mono">2 · How long does minting stay open?</label>
                <div className="grid grid-cols-3 gap-4">
                  <Field label="PRICE (RITUAL)" value={pubPrice} onChange={setPubPrice} type="number" />
                  <Field label="MAX / WALLET" value={pubMax} onChange={setPubMax} type="number" />
                  <Field label="OPEN FOR (DAYS)" value={pubDurDays} onChange={setPubDurDays} type="number" />
                </div>
                <p className="text-[11px] text-grimoire-muted font-sans">
                  Buyers can mint until this window closes or the collection sells out. 30 days is a safe default.
                </p>
              </div>

              <div className="h-px bg-grimoire-border" />

              {/* ── Optional allowlist (advanced) ── */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setGtdEnabled(!gtdEnabled)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${gtdEnabled ? "bg-grimoire-purple" : "bg-grimoire-border"}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${gtdEnabled ? "left-5" : "left-0.5"}`} />
                  </button>
                  <div>
                    <span className="text-xs font-mono text-grimoire-ink">Add an allowlist phase first (optional)</span>
                    <p className="text-[10px] text-grimoire-muted font-sans">A private window for approved wallets before public mint opens.</p>
                  </div>
                </div>

                {gtdEnabled && (
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-3 gap-4">
                      <Field label="PRICE (RITUAL)" value={gtdPrice} onChange={setGtdPrice} type="number" />
                      <Field label="MAX / WALLET" value={gtdMax} onChange={setGtdMax} type="number" />
                      <Field label="OPEN FOR (DAYS)" value={gtdDurDays} onChange={setGtdDurDays} type="number" />
                    </div>
                    <div>
                      <label className="block text-xs text-grimoire-muted uppercase tracking-wider font-mono mb-2">ALLOWLIST WALLETS</label>
                      <textarea
                        className="w-full h-24 rounded-xl bg-grimoire-surface border border-grimoire-border text-white text-xs font-mono p-3 resize-none focus:border-grimoire-purple outline-none"
                        placeholder={"0xABC...\n0xDEF..."}
                        value={allowlistCSV}
                        onChange={e => setAllowlistCSV(e.target.value)}
                      />
                      <div className="flex gap-2 mt-2">
                        <button className="px-3 py-1.5 rounded-lg border border-grimoire-border text-grimoire-muted text-[10px] font-mono hover:bg-grimoire-surface transition-colors" onClick={handleMerkle}>Generate Root</button>
                        <label className="px-3 py-1.5 rounded-lg border border-grimoire-border text-grimoire-muted text-[10px] font-mono hover:bg-grimoire-surface transition-colors cursor-pointer">
                          Upload CSV
                          <input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
                        </label>
                        {csvFile && <span className="text-[10px] font-mono text-grimoire-muted self-center">{csvFile}</span>}
                      </div>
                      {merkleRoot !== zeroHash && <p className="text-[10px] mt-2 font-mono text-grimoire-purple-light break-all">Root: {merkleRoot}</p>}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Plain-language summary ── */}
              <div className="p-4 rounded-xl bg-grimoire-purple/5 border border-grimoire-purple/20 space-y-1">
                <p className="text-[10px] font-mono text-grimoire-purple-light uppercase tracking-widest">Summary</p>
                <p className="text-xs text-grimoire-ink font-sans leading-relaxed">
                  {mintDate ? `Minting opens ${getScheduleLabel().replace("Mint starts in", "in").toLowerCase()}` : "Minting opens the moment you deploy"}
                  {gtdEnabled
                    ? `. First an allowlist phase for ${gtdDurDays} day${gtdDurDays === "1" ? "" : "s"} at ${gtdPrice} RITUAL, then public mint for ${pubDurDays} day${pubDurDays === "1" ? "" : "s"} at ${pubPrice} RITUAL.`
                    : `, then stays open for ${pubDurDays} day${pubDurDays === "1" ? "" : "s"} at ${pubPrice} RITUAL each (max ${pubMax}/wallet).`}
                </p>
              </div>

              <div className="flex gap-3">
                <button className="flex-1 py-3 rounded-xl border border-grimoire-border text-grimoire-muted font-display text-sm hover:bg-grimoire-surface transition-colors" onClick={() => setStep(3)}>BACK</button>
                <button className="flex-1 py-3 rounded-xl bg-grimoire-purple text-white font-display text-sm tracking-wider hover:bg-grimoire-purple/80 transition-colors" onClick={() => setStep(5)}>REVIEW</button>
              </div>
            </div>
          )}

          {/* ── Step 5: Review & Deploy ── */}
          {step === 5 && (
            <div className="story-panel p-8 space-y-6">
              <h2 className="font-display text-white text-lg">Review & Deploy</h2>
              <div className="space-y-0">
                {[
                  ["Name", name],
                  ["Symbol", symbol],
                  ["Type", collectionType.toUpperCase()],
                  ["Max Supply", imageMode === "multi" ? String(multiImages.length) : maxSupply],
                  ["Images", imageMode === "single" ? "Single cover" : `${multiImages.length} unique`],
                  ["Royalty", `${royaltyFee}%`],
                  ...(gtdEnabled ? [["GTD Price", `${gtdPrice} RITUAL`]] : []),
                  ["Public Price", `${pubPrice} RITUAL`],
                  ["Schedule", getScheduleLabel()],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between py-3 border-b border-grimoire-border/30">
                    <span className="text-xs text-grimoire-muted uppercase tracking-wider font-mono">{l}</span>
                    <span className="text-sm text-white font-mono">{v}</span>
                  </div>
                ))}
              </div>

              {uploadProgress && (
                <div className="p-3 rounded-xl bg-grimoire-purple/10 border border-grimoire-purple/20">
                  <p className="text-xs font-mono text-grimoire-purple-light">{uploadProgress}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button className="flex-1 py-3 rounded-xl border border-grimoire-border text-grimoire-muted font-display text-sm hover:bg-grimoire-surface transition-colors" onClick={() => setStep(4)}>BACK</button>
                <button
                  className="flex-1 py-3 rounded-xl bg-grimoire-purple text-white font-display text-sm tracking-wider hover:bg-grimoire-purple/80 transition-colors disabled:opacity-40"
                  onClick={handleDeploy}
                  disabled={isPending || isConfirming}
                >
                  {isPending ? "CONFIRM IN WALLET..." : isConfirming ? "DEPLOYING..." : "DEPLOY COLLECTION"}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 6: Post-Deploy — Generate Living World ── */}
          {step === 6 && deployedCollection && (
            <div className="story-panel p-8 space-y-6 text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-grimoire-purple/10 border border-grimoire-purple/30 flex items-center justify-center">
                <span className="text-grimoire-purple-light font-display text-xl">&#10003;</span>
              </div>
              <h2 className="font-display text-white text-2xl">Collection Deployed</h2>
              <p className="text-grimoire-muted text-sm font-sans">&quot;{name}&quot; is now live on Ritual Chain.</p>
              <div className="p-3 rounded-xl bg-grimoire-surface border border-grimoire-border">
                <p className="text-[10px] font-mono text-grimoire-muted break-all">{deployedCollection}</p>
              </div>

              {/* Lore generation */}
              {loreStatus === "idle" && (
                <button
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-grimoire-purple to-grimoire-gold text-white font-display text-sm tracking-wider hover:opacity-90 transition-opacity"
                  onClick={handleGenerateLore}
                >
                  GENERATE LIVING WORLD
                </button>
              )}

              {loreStatus === "generating" && (
                <div className="space-y-3">
                  <p className="text-xs font-mono text-grimoire-purple-light animate-pulse">AI is weaving the story of your collection...</p>
                  <div className="w-full h-2 bg-grimoire-surface rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-grimoire-purple to-grimoire-gold transition-all duration-500 rounded-full" style={{ width: `${loreProgress}%` }} />
                  </div>
                </div>
              )}

              {loreStatus === "done" && (
                <div className="space-y-4">
                  <p className="text-xs font-mono text-grimoire-teal">Living World created successfully.</p>
                  <div className="flex gap-3 justify-center">
                    <a href={`/collection/${deployedCollection}`} className="px-5 py-2.5 rounded-xl bg-grimoire-purple text-white text-xs font-display tracking-wider hover:bg-grimoire-purple/80 transition-colors">
                      View Collection
                    </a>
                    <a href="/explore" className="px-5 py-2.5 rounded-xl border border-grimoire-border text-grimoire-muted text-xs font-display tracking-wider hover:bg-grimoire-surface transition-colors">
                      Explore All
                    </a>
                  </div>
                </div>
              )}

              {loreStatus === "error" && (
                <div className="space-y-3">
                  <p className="text-xs font-mono text-red-400">Lore generation failed. You can retry.</p>
                  <button
                    className="px-5 py-2.5 rounded-xl border border-grimoire-border text-grimoire-muted text-xs font-display hover:bg-grimoire-surface transition-colors"
                    onClick={handleGenerateLore}
                  >
                    Retry Generation
                  </button>
                </div>
              )}

              <div className="flex gap-3 justify-center pt-2">
                <a
                  href={`https://explorer.ritualfoundation.org/address/${deployedCollection}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-mono text-grimoire-muted hover:text-grimoire-purple-light transition-colors"
                >
                  View on Explorer
                </a>
              </div>
            </div>
          )}
        </section>
      </div>

      <Footer />
    </main>
  );
}

// ── Field Component ───────────────────────────────────────────

function Field({ label, value, onChange, placeholder, type }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-grimoire-muted uppercase tracking-wider font-mono mb-2">{label}</label>
      <input
        className="w-full rounded-xl bg-grimoire-surface border border-grimoire-border text-white text-sm font-sans px-4 py-3 focus:border-grimoire-purple outline-none transition-colors"
        type={type || "text"}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

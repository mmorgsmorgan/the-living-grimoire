// =============================================
// The Living Grimoire — Smart Contract ABIs & Addresses
// =============================================
// Merges the original Mini Cauldron ABI with the Factory,
// AIRitualNFT, and Marketplace ABIs from The-Cauldron.

import { type Abi } from "viem";

// ── Contract Addresses ────────────────────────────────────────

/** NFTFactory — deploys new ERC-721A collections */
const DEFAULT_FACTORY = "0xCeD6f5eA4b8e9D448fF732Ef44267D6cbD9F750f" as const;
export const FACTORY_ADDRESS = (process.env.NEXT_PUBLIC_FACTORY_ADDRESS || DEFAULT_FACTORY) as `0x${string}`;

/** RitualMarketplace — list/buy/cancel NFTs */
const DEFAULT_MARKETPLACE = "0x9cDB207D834c1c5FE3b1777fC360eC4473f5A38B" as const;
export const MARKETPLACE_ADDRESS = (process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS || DEFAULT_MARKETPLACE) as `0x${string}`;

/** Legacy Mini Cauldron contract (for existing minting) */
export const NFT_CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_NFT_CONTRACT as `0x${string}`) ??
  "0xb26e453CAF6EAa68248447052A0AC75a84650312";

// ── NFTFactory ABI ────────────────────────────────────────────

export const NFTFactory_ABI = [
  {
    inputs: [
      { name: "name_", type: "string" },
      { name: "symbol_", type: "string" },
      { name: "baseURI_", type: "string" },
      { name: "maxSupply_", type: "uint256" },
      { name: "royaltyReceiver_", type: "address" },
      { name: "royaltyFee_", type: "uint96" },
      {
        name: "phases_",
        type: "tuple[]",
        components: [
          { name: "startTime", type: "uint64" },
          { name: "endTime", type: "uint64" },
          { name: "price", type: "uint128" },
          { name: "maxPerWallet", type: "uint32" },
          { name: "merkleRoot", type: "bytes32" },
          { name: "isPublic", type: "bool" },
        ],
      },
    ],
    name: "createCollection",
    outputs: [{ name: "clone", type: "address" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "getCollectionsByOwner",
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getAllCollections",
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalCollections",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  // CollectionCreated event — emitted when a new collection is deployed
  {
    type: "event",
    name: "CollectionCreated",
    inputs: [
      { name: "owner", type: "address", indexed: true },
      { name: "collection", type: "address", indexed: true },
      { name: "name", type: "string", indexed: false },
      { name: "symbol", type: "string", indexed: false },
      { name: "maxSupply", type: "uint256", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
] as const;

// ── AIRitualNFT ABI (deployed collection) ─────────────────────

export const AIRitualNFT_ABI = [
  {
    inputs: [{ name: "phaseId", type: "uint256" }, { name: "quantity", type: "uint256" }, { name: "proof", type: "bytes32[]" }],
    name: "allowlistMint",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ name: "phaseId", type: "uint256" }, { name: "quantity", type: "uint256" }],
    name: "publicMint",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ name: "to", type: "address" }, { name: "quantity", type: "uint256" }],
    name: "ownerMint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "maxSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalMinted",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalPhases",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "phaseId", type: "uint256" }],
    name: "getPhase",
    outputs: [{
      components: [
        { name: "startTime", type: "uint64" },
        { name: "endTime", type: "uint64" },
        { name: "price", type: "uint128" },
        { name: "maxPerWallet", type: "uint32" },
        { name: "merkleRoot", type: "bytes32" },
        { name: "isPublic", type: "bool" },
      ],
      name: "",
      type: "tuple",
    }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "phaseId", type: "uint256" }, { name: "root", type: "bytes32" }],
    name: "setMerkleRoot",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "phaseId", type: "uint256" }, { name: "start", type: "uint64" }, { name: "end", type: "uint64" }],
    name: "setPhaseTime",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "newBaseURI", type: "string" }],
    name: "setBaseURI",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{
      name: "phase",
      type: "tuple",
      components: [
        { name: "startTime", type: "uint64" },
        { name: "endTime", type: "uint64" },
        { name: "price", type: "uint128" },
        { name: "maxPerWallet", type: "uint32" },
        { name: "merkleRoot", type: "bytes32" },
        { name: "isPublic", type: "bool" },
      ],
    }],
    name: "addPhase",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "operator", type: "address" }, { name: "approved", type: "bool" }],
    name: "setApprovalForAll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "owner", type: "address" }, { name: "operator", type: "address" }],
    name: "isApprovedForAll",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "tokensOfOwner",
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "baseURI",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }, { name: "salePrice", type: "uint256" }],
    name: "royaltyInfo",
    outputs: [{ name: "receiver", type: "address" }, { name: "royaltyAmount", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "phaseId", type: "uint256" }, { name: "wallet", type: "address" }],
    name: "mintedPerWalletPerPhase",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  // Standard ERC-721 functions
  {
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "tokenURI",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// ── RitualMarketplace ABI ─────────────────────────────────────

export const RitualMarketplace_ABI = [
  {
    inputs: [{ name: "nftContract", type: "address" }, { name: "tokenId", type: "uint256" }, { name: "price", type: "uint256" }],
    name: "list",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "nftContract", type: "address" }, { name: "tokenId", type: "uint256" }],
    name: "buy",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ name: "nftContract", type: "address" }, { name: "tokenId", type: "uint256" }],
    name: "cancelListing",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "nftContract", type: "address" }, { name: "tokenId", type: "uint256" }],
    name: "getListing",
    outputs: [{
      components: [
        { name: "seller", type: "address" },
        { name: "nftContract", type: "address" },
        { name: "tokenId", type: "uint256" },
        { name: "price", type: "uint256" },
        { name: "active", type: "bool" },
      ],
      name: "",
      type: "tuple",
    }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "nftContract", type: "address" }, { name: "tokenId", type: "uint256" }],
    name: "isListed",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// ── Legacy Mini Cauldron ABI ──────────────────────────────────

export const MINT_PRICE_ETH = "0.01";
export const MAX_SUPPLY = 99;

export const COLLECTION = {
  name: "The Mini Cauldron",
  description:
    "99 unique genesis artifacts forged on Ritual Chain by Zuma.",
  symbol: "MCLD",
};

export const NFT_ABI = [
  { type: "function", name: "totalSupply", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "soldOut", inputs: [], outputs: [{ name: "", type: "bool" }], stateMutability: "view" },
  { type: "function", name: "hasMinted", inputs: [{ name: "wallet", type: "address" }], outputs: [{ name: "", type: "bool" }], stateMutability: "view" },
  { type: "function", name: "tokenURI", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ name: "", type: "string" }], stateMutability: "view" },
  { type: "function", name: "ownerOf", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { type: "function", name: "MAX_SUPPLY", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "MINT_PRICE", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "mint", inputs: [], outputs: [], stateMutability: "payable" },
  { type: "function", name: "setBaseURI", inputs: [{ name: "newBaseURI", type: "string" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "withdraw", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "event", name: "Transfer", inputs: [{ name: "from", type: "address", indexed: true }, { name: "to", type: "address", indexed: true }, { name: "tokenId", type: "uint256", indexed: true }] },
  { type: "event", name: "Minted", inputs: [{ name: "to", type: "address", indexed: true }, { name: "tokenId", type: "uint256", indexed: true }] },
  { type: "error", name: "SoldOut", inputs: [] },
  { type: "error", name: "AlreadyMinted", inputs: [] },
  { type: "error", name: "WithdrawFailed", inputs: [] },
  { type: "error", name: "InvalidBaseURI", inputs: [] },
  { type: "error", name: "InsufficientPayment", inputs: [{ name: "sent", type: "uint256" }, { name: "required", type: "uint256" }] },
] as const satisfies Abi;

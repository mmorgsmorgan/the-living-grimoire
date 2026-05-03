import { type Abi } from "viem";

/**
 * NFT contract configuration.
 * Set NEXT_PUBLIC_NFT_CONTRACT to override this default address.
 */

export const NFT_CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_NFT_CONTRACT as `0x${string}`) ??
  "0xb26e453CAF6EAa68248447052A0AC75a84650312";

/** Total number of NFTs in the collection */
export const MAX_SUPPLY = 99;

/** Mint price in RITUAL native currency */
export const MINT_PRICE_ETH = "0.01";

/** Placeholder collection metadata */
export const COLLECTION = {
  name: "Ritual Genesis",
  description:
    "99 unique genesis artifacts forged on Ritual Chain — the first L1 with enshrined AI precompiles. Each NFT is a key to an on-chain world of verifiable intelligence.",
  symbol: "RGEN",
};

/**
 * Full NFT contract ABI.
 *
 * FIX: Added `Minted` custom event (emitted alongside Transfer in mint()).
 * FIX: `Transfer` event args now use correct ERC-721 indexed signature.
 * FIX: `hasMinted` mapping is now implemented in the contract and in the ABI.
 */
export const NFT_ABI = [
  // ── View functions ──────────────────────────────────────────────────────
  {
    type: "function",
    name: "totalSupply",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "soldOut",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hasMinted",
    inputs: [{ name: "wallet", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "tokenURI",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "ownerOf",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "MAX_SUPPLY",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "MINT_PRICE",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  // ── Write functions ──────────────────────────────────────────────────────
  {
    type: "function",
    name: "mint",
    inputs: [],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "setBaseURI",
    inputs: [{ name: "newBaseURI", type: "string" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "withdraw",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // ── Events ───────────────────────────────────────────────────────────────
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from",    type: "address", indexed: true },
      { name: "to",      type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
    ],
  },
  {
    type: "event",
    name: "Minted",
    inputs: [
      { name: "to",      type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
    ],
  },
  // ── Errors ───────────────────────────────────────────────────────────────
  { type: "error", name: "SoldOut",              inputs: [] },
  { type: "error", name: "AlreadyMinted",        inputs: [] },
  { type: "error", name: "WithdrawFailed",       inputs: [] },
  { type: "error", name: "InvalidBaseURI",       inputs: [] },
  {
    type: "error",
    name: "InsufficientPayment",
    inputs: [
      { name: "sent",     type: "uint256" },
      { name: "required", type: "uint256" },
    ],
  },
] as const satisfies Abi;

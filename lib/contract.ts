import { type Abi } from "viem";

/**
 * NFT contract configuration.
 * Set NEXT_PUBLIC_NFT_CONTRACT to override this default address.
 * The ABI exposes the two key functions: totalSupply() and mint().
 */

export const NFT_CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_NFT_CONTRACT as `0x${string}`) ??
  "0xb26e453CAF6EAa68248447052A0AC75a84650312";

/** Total number of NFTs in the collection */
export const MAX_SUPPLY = 99;

/** Mint price in ETH / RITUAL (hardcoded for now) */
export const MINT_PRICE_ETH = "0.01";

/** Placeholder collection metadata */
export const COLLECTION = {
  name: "Ritual Genesis",
  description:
    "99 unique genesis artifacts forged on Ritual Chain — the first L1 with enshrined AI precompiles. Each NFT is a key to an on-chain world of verifiable intelligence.",
  symbol: "RGEN",
};

/**
 * Minimal NFT contract ABI.
 * Assumes an ERC-721 with:
 *   - totalSupply() → uint256
 *   - mint()        → payable, mints 1 token to msg.sender
 *
 * Swap this out when you deploy a real contract.
 */
export const NFT_ABI = [
  {
    type: "function",
    name: "totalSupply",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "mint",
    inputs: [],
    outputs: [],
    stateMutability: "payable",
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
    name: "hasMinted",
    inputs: [{ name: "wallet", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
    ],
  },
] as const satisfies Abi;

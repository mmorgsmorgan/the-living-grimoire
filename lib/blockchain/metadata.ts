// =============================================
// The Living Grimoire — On-Chain NFT Metadata Fetcher
// =============================================
// Fetches live ERC-721 metadata from Ritual Chain using viem

import { createPublicClient, http, type Address } from "viem";
import { ritualChain } from "@/lib/chain";

/** Minimal ERC-721 ABI for metadata queries */
const ERC721_METADATA_ABI = [
  {
    type: "function",
    name: "totalSupply",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
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
    name: "name",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "symbol",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

/** Parsed NFT metadata from tokenURI */
export interface NFTMetadata {
  tokenId: number;
  name?: string;
  description?: string;
  image?: string;
  attributes: { trait_type: string; value: string }[];
}

/** Aggregated collection context for AI prompting */
export interface CollectionContext {
  contractAddress: string;
  chainId: number;
  collectionName: string;
  collectionSymbol: string;
  totalSupply: number;
  sampledNFTs: NFTMetadata[];
  traitSummary: Record<string, string[]>; // trait_type -> unique values
}

/**
 * Create a viem public client for Ritual Chain
 */
function getClient() {
  return createPublicClient({
    chain: ritualChain,
    transport: http(),
  });
}

/**
 * Resolve an IPFS URI to an HTTP gateway URL
 */
function resolveURI(uri: string): string {
  if (uri.startsWith("ipfs://")) {
    return uri.replace("ipfs://", "https://ipfs.io/ipfs/");
  }
  if (uri.startsWith("ar://")) {
    return uri.replace("ar://", "https://arweave.net/");
  }
  return uri;
}

/**
 * Fetch and parse a single token's metadata JSON
 */
async function fetchTokenMetadata(
  client: ReturnType<typeof getClient>,
  contractAddress: Address,
  tokenId: number
): Promise<NFTMetadata | null> {
  try {
    const uri = await client.readContract({
      address: contractAddress,
      abi: ERC721_METADATA_ABI,
      functionName: "tokenURI",
      args: [BigInt(tokenId)],
    });

    if (!uri) return null;

    const resolvedURI = resolveURI(uri);
    const response = await fetch(resolvedURI, {
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) return null;

    const json = await response.json();

    return {
      tokenId,
      name: json.name ?? undefined,
      description: json.description ?? undefined,
      image: json.image ? resolveURI(json.image) : undefined,
      attributes: Array.isArray(json.attributes)
        ? json.attributes.map((a: { trait_type?: string; value?: string }) => ({
            trait_type: String(a.trait_type ?? "Unknown"),
            value: String(a.value ?? ""),
          }))
        : [],
    };
  } catch (err) {
    console.warn(`Failed to fetch metadata for token #${tokenId}:`, err);
    return null;
  }
}

/**
 * Build a summary of all unique trait types and values across sampled NFTs
 */
function buildTraitSummary(nfts: NFTMetadata[]): Record<string, string[]> {
  const summary: Record<string, Set<string>> = {};

  for (const nft of nfts) {
    for (const attr of nft.attributes) {
      if (!summary[attr.trait_type]) {
        summary[attr.trait_type] = new Set();
      }
      summary[attr.trait_type].add(attr.value);
    }
  }

  // Convert Sets to sorted arrays
  const result: Record<string, string[]> = {};
  for (const [key, values] of Object.entries(summary)) {
    result[key] = [...values].sort();
  }
  return result;
}

/**
 * Main entry point: Fetch collection metadata from Ritual Chain.
 *
 * @param contractAddress - The ERC-721 contract address
 * @param sampleSize - Max number of NFTs to sample (default 15)
 * @returns CollectionContext ready for AI prompting
 */
export async function fetchCollectionMetadata(
  contractAddress: string,
  sampleSize = 15
): Promise<CollectionContext> {
  const client = getClient();
  const address = contractAddress as Address;

  // Fetch collection name and symbol
  let collectionName = "Unknown Collection";
  let collectionSymbol = "???";

  try {
    collectionName = await client.readContract({
      address,
      abi: ERC721_METADATA_ABI,
      functionName: "name",
    });
  } catch {
    console.warn("Could not read collection name");
  }

  try {
    collectionSymbol = await client.readContract({
      address,
      abi: ERC721_METADATA_ABI,
      functionName: "symbol",
    });
  } catch {
    console.warn("Could not read collection symbol");
  }

  // Fetch total supply
  let totalSupply = 0;
  try {
    const supply = await client.readContract({
      address,
      abi: ERC721_METADATA_ABI,
      functionName: "totalSupply",
    });
    totalSupply = Number(supply);
  } catch {
    console.warn("Could not read totalSupply, defaulting to 0");
  }

  // Sample token IDs — spread evenly across the collection
  const tokenIds: number[] = [];
  if (totalSupply > 0) {
    const step = Math.max(1, Math.floor(totalSupply / sampleSize));
    for (let i = 1; i <= totalSupply && tokenIds.length < sampleSize; i += step) {
      tokenIds.push(i);
    }
  } else {
    // If totalSupply is unknown, try first N tokens starting from 0 and 1
    for (let i = 0; i < sampleSize; i++) {
      tokenIds.push(i);
    }
  }

  // Fetch metadata in parallel with concurrency limit
  const BATCH_SIZE = 5;
  const sampledNFTs: NFTMetadata[] = [];

  for (let i = 0; i < tokenIds.length; i += BATCH_SIZE) {
    const batch = tokenIds.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((id) => fetchTokenMetadata(client, address, id))
    );

    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        sampledNFTs.push(result.value);
      }
    }
  }

  const traitSummary = buildTraitSummary(sampledNFTs);

  return {
    contractAddress,
    chainId: ritualChain.id,
    collectionName,
    collectionSymbol,
    totalSupply,
    sampledNFTs,
    traitSummary,
  };
}

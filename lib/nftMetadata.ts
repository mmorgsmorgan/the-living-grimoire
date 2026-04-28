import { type PublicClient } from "viem";
import { NFT_ABI, NFT_CONTRACT_ADDRESS } from "@/lib/contract";

export type NftTrait = {
  trait_type: string;
  value: string;
};

export type MintedNft = {
  tokenId: number;
  tokenURI: string;
  metadataURI: string;
  name?: string;
  description?: string;
  image?: string;
  attributes: NftTrait[];
};

export function normalizeUri(uri: string, gatewayIndex = 0): string {
  if (!uri) return uri;

  const gateways = [
    "https://ipfs.io/ipfs/",
    "https://cloudflare-ipfs.com/ipfs/",
    "https://gateway.pinata.cloud/ipfs/",
    "https://dweb.link/ipfs/",
  ];

  const cleanUri = uri.startsWith("ipfs://") ? uri.slice("ipfs://".length) : uri;
  if (cleanUri.startsWith("http")) return cleanUri;

  return `${gateways[gatewayIndex % gateways.length]}${cleanUri}`;
}

export async function fetchJson<T>(url: string, retries = 3): Promise<T | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });
      if (response.ok) {
        return (await response.json()) as T;
      }
    } catch {
      // continue retry loop
    }

    if (i < retries - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  return null;
}

export async function resolveMintedNft(
  publicClient: PublicClient,
  tokenId: number
): Promise<MintedNft | null> {
  const tokenURI = await publicClient.readContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: NFT_ABI,
    functionName: "tokenURI",
    args: [BigInt(tokenId)],
  });

  let metadata = null;
  let metadataURI = "";

  for (let g = 0; g < 3; g++) {
    metadataURI = normalizeUri(tokenURI, g);
    metadata = await fetchJson<{
      name?: string;
      description?: string;
      image?: string;
      attributes?: Array<{ trait_type?: string; value?: unknown }>;
    }>(metadataURI);

    if (metadata) break;
  }

  if (!metadata) {
    return {
      tokenId,
      tokenURI,
      metadataURI,
      attributes: [],
    };
  }

  const attributes =
    metadata.attributes
      ?.filter((item) => item?.trait_type && item?.value !== undefined)
      .map((item) => ({
        trait_type: String(item.trait_type),
        value: String(item.value),
      })) ?? [];

  return {
    tokenId,
    tokenURI,
    metadataURI,
    name: metadata.name,
    description: metadata.description,
    image: metadata.image ? normalizeUri(metadata.image) : undefined,
    attributes,
  };
}

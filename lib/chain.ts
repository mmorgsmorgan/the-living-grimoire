import { defineChain } from "viem";

/**
 * Ritual Chain (Chain ID 1979) — testnet with native AI precompiles.
 * All RITUAL tokens are free testnet tokens with no real-world value.
 */
export const ritualChain = defineChain({
  id: 1979,
  name: "Ritual",
  nativeCurrency: {
    decimals: 18,
    name: "Ritual",
    symbol: "RITUAL",
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_RPC_URL ?? "https://rpc.ritualfoundation.org",
      ],
      webSocket: [
        process.env.NEXT_PUBLIC_WS_URL ?? "wss://rpc.ritualfoundation.org/ws",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Ritual Explorer",
      url: "https://explorer.ritualfoundation.org",
    },
  },
  // NOTE: Ritual Chain has NO multicall3 contract deployed. Declaring one
  // makes wagmi/viem batch every read through it, and since the address is
  // empty the calls silently return nothing (blank "Loading…", 0/0, no phase).
  // Leaving `contracts` empty forces individual eth_call reads, which work.
});

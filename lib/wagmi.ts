import { http, createConfig } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
import { ritualChain } from "./chain";

/**
 * wagmi config for Ritual Chain.
 * Supports MetaMask (injected) + WalletConnect.
 *
 * FIX: Added `injected` connector so MetaMask and any EIP-1193
 * browser wallet shows up in the picker. Without this, the
 * connectors[] array was empty unless WC_PROJECT_ID was set.
 */
export const wagmiConfig = createConfig({
  chains: [ritualChain],
  connectors: [
    injected({ shimDisconnect: true }),
    ...(process.env.NEXT_PUBLIC_WC_PROJECT_ID
      ? [walletConnect({ projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID })]
      : []),
  ],
  transports: {
    [ritualChain.id]: http(
      process.env.NEXT_PUBLIC_RPC_URL ?? "https://rpc.ritualfoundation.org"
    ),
  },
});

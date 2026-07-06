"use client";

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "@/lib/wagmi";
import { Toaster } from "react-hot-toast";
import { useState } from "react";

/**
 * Root providers: wagmi + react-query + toast notifications.
 * Restyled for The Living Grimoire dark mystical theme.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10_000,
            retry: 2,
          },
        },
      })
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster
          position="bottom-right"
          gutter={8}
          toastOptions={{
            style: {
              background: "#140e24",
              color: "#d4c5a9",
              border: "1px solid #2a1f4e",
              fontFamily: "'Barlow', system-ui, sans-serif",
              fontSize: "14px",
              borderRadius: "12px",
              padding: "12px 16px",
              maxWidth: "380px",
            },
            duration: 4000,
            success: {
              duration: 5000,
              iconTheme: {
                primary: "#c9a84c",
                secondary: "#140e24",
              },
              style: {
                border: "1px solid rgba(201, 168, 76, 0.3)",
              },
            },
            error: {
              duration: 6000,
              iconTheme: {
                primary: "#dc2626",
                secondary: "#140e24",
              },
              style: {
                border: "1px solid rgba(220, 38, 38, 0.3)",
              },
            },
            loading: {
              iconTheme: {
                primary: "#8b5cf6",
                secondary: "#140e24",
              },
            },
          }}
        />
      </QueryClientProvider>
    </WagmiProvider>
  );
}

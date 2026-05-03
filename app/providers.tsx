"use client";

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "@/lib/wagmi";
import { Toaster } from "react-hot-toast";
import { useState } from "react";

/**
 * Root providers: wagmi + react-query + toast notifications.
 *
 * FIX: Toast style uses hex colors directly instead of CSS vars
 *      (CSS custom properties don't resolve in JS inline styles).
 * FIX: Duration reduced to a more user-friendly 4s for success,
 *      6s for errors so users have time to read them.
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
            // Base styles — Ritual dark theme
            style: {
              background: "#111827",
              color: "#D1D5DB",
              border: "1px solid #374151",
              fontFamily: "'Barlow', system-ui, sans-serif",
              fontSize: "14px",
              borderRadius: "10px",
              padding: "12px 16px",
              maxWidth: "380px",
            },
            duration: 4000,
            success: {
              duration: 5000,
              iconTheme: {
                primary: "#19D184",
                secondary: "#111827",
              },
              style: {
                border: "1px solid rgba(25, 209, 132, 0.3)",
              },
            },
            error: {
              duration: 6000,
              iconTheme: {
                primary: "#EF4444",
                secondary: "#111827",
              },
              style: {
                border: "1px solid rgba(239, 68, 68, 0.3)",
              },
            },
            loading: {
              iconTheme: {
                primary: "#FACC15",
                secondary: "#111827",
              },
            },
          }}
        />
      </QueryClientProvider>
    </WagmiProvider>
  );
}

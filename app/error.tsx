"use client";

// Route-level error boundary. Required by Next.js App Router so client
// navigations always have an error component to fall back to.

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error:", error);
  }, [error]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center grimoire-mesh px-4 text-center">
      <div className="w-16 h-16 mb-5 rounded-2xl overflow-hidden border border-grimoire-border shadow-glow-purple flex items-center justify-center bg-grimoire-surface">
        <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
      </div>
      <h1 className="font-display text-white text-2xl mb-2">Something broke in the weave</h1>
      <p className="text-grimoire-muted text-sm font-sans mb-6 max-w-md">
        {error?.message || "An unexpected error occurred while rendering this page."}
      </p>
      <div className="flex gap-3">
        <button onClick={() => reset()} className="btn-primary text-xs px-5 py-2.5">
          Try Again
        </button>
        <a href="/" className="btn-secondary text-xs px-5 py-2.5">
          Return Home
        </a>
      </div>
    </main>
  );
}

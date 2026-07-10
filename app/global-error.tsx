"use client";

// Global error boundary — catches errors in the root layout itself.
// Must render its own <html>/<body>.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#0a0710", color: "#e8e4f0", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "1rem" }}>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Something broke in the weave</h1>
          <p style={{ fontSize: "0.875rem", color: "#9a90b0", marginBottom: "1.5rem", maxWidth: "28rem" }}>
            {error?.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={() => reset()}
            style={{ padding: "0.625rem 1.25rem", borderRadius: "0.75rem", background: "#7c5cff", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.8rem" }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}

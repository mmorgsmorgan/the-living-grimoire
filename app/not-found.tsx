import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center grimoire-mesh px-4 text-center">
      <div className="w-16 h-16 mb-5 rounded-2xl overflow-hidden border border-grimoire-border shadow-glow-purple flex items-center justify-center bg-grimoire-surface">
        <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
      </div>
      <h1 className="font-display text-white text-2xl mb-2">Page Not Found</h1>
      <p className="text-grimoire-muted text-sm font-sans mb-6 max-w-md">
        This page has drifted beyond the edges of the grimoire.
      </p>
      <Link href="/" className="btn-primary text-xs px-5 py-2.5">Return Home</Link>
    </main>
  );
}

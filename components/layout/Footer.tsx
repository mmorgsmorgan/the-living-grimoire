import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-grimoire-border/50 py-10 px-4 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-grimoire-muted">
        <div className="flex flex-col items-center sm:items-start gap-1">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="The Living Grimoire" className="w-7 h-7 rounded-md object-cover" />
            <span className="font-display text-grimoire-gold text-sm">The Living Grimoire</span>
          </div>
          <span className="font-mono text-grimoire-muted/60">AI-Powered NFT Storytelling · Ritual Chain</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/explore" className="hover:text-grimoire-gold transition-colors">Explore</Link>
          <Link href="/create" className="hover:text-grimoire-gold transition-colors">Create</Link>
          <a href="https://explorer.ritualfoundation.org" target="_blank" rel="noopener noreferrer" className="hover:text-grimoire-gold transition-colors">
            Explorer ↗
          </a>
          <a href="https://faucet.ritualfoundation.org" target="_blank" rel="noopener noreferrer" className="hover:text-grimoire-gold transition-colors">
            Faucet ↗
          </a>
        </div>
        <span className="font-mono">© {new Date().getFullYear()} by Zuma <span className="text-[7px] opacity-40 align-super tracking-tight">bdh</span></span>
      </div>
    </footer>
  );
}

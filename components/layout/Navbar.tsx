"use client";

import Link from "next/link";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { ritualChain } from "@/lib/chain";
import { useEffect, useRef, useState } from "react";

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function Navbar() {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const [showMenu, setShowMenu] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isWrongChain = isConnected && chain?.id !== ritualChain.id;

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showMenu]);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/explore", label: "Explore" },
    { href: "/market", label: "Market" },
    { href: "/create", label: "Create" },
  ];

  return (
    <>
      {/* Wrong chain banner */}
      {mounted && isWrongChain && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-grimoire-ember/10 border-b border-grimoire-ember/30 px-4 py-2 flex items-center justify-center gap-3 text-sm text-grimoire-ember">
          <span className="font-semibold">⚠ Wrong network</span>
          <button
            onClick={() => switchChain({ chainId: ritualChain.id })}
            disabled={isSwitching}
            className="px-3 py-0.5 text-xs font-semibold border border-grimoire-ember/50 rounded-lg hover:bg-grimoire-ember/10 transition-colors disabled:opacity-50"
          >
            {isSwitching ? "Switching…" : "Switch to Ritual Chain"}
          </button>
        </div>
      )}

      <header
        className={`fixed left-0 right-0 z-50 border-b border-grimoire-border/60 backdrop-blur-md bg-grimoire-bg/80 transition-all duration-200 ${
          mounted && isWrongChain ? "top-10" : "top-0"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <img src="/logo.png" alt="The Living Grimoire" className="w-9 h-9 rounded-lg object-cover shadow-glow-purple group-hover:shadow-glow-gold transition-shadow duration-500" />
            <div className="flex flex-col">
              <span className="font-display text-grimoire-gold-light text-base tracking-wide leading-tight">
                The Living Grimoire
              </span>
              <span className="text-[10px] text-grimoire-muted font-mono hidden sm:block">
                AI-Powered NFT Stories
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 text-sm font-sans font-medium text-grimoire-muted hover:text-grimoire-gold transition-colors rounded-lg hover:bg-grimoire-surface/50"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side: wallet + mobile toggle */}
          <div className="flex items-center gap-3">
            {/* Wallet area */}
            {!mounted && (
              <div className="h-9 w-32 rounded-lg border border-grimoire-border bg-grimoire-elevated animate-pulse" />
            )}

            {mounted && !isConnected && (
              <div className="relative" ref={menuRef}>
                <button
                  id="connect-wallet-btn"
                  onClick={() => setShowMenu(!showMenu)}
                  disabled={isPending}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-sans font-semibold text-grimoire-purple-light border border-grimoire-purple/40 rounded-lg hover:bg-grimoire-purple/10 hover:border-grimoire-purple transition-all duration-200"
                >
                  <span className="w-2 h-2 rounded-full bg-grimoire-purple/60 animate-pulse" />
                  {isPending ? "Connecting…" : "Connect Wallet"}
                </button>

                {showMenu && connectors.length > 0 && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-grimoire-elevated border border-grimoire-border rounded-xl shadow-card overflow-hidden z-50">
                    <p className="px-4 py-2 text-xs text-grimoire-muted uppercase tracking-wider border-b border-grimoire-border">
                      Choose Wallet
                    </p>
                    {connectors.map((connector) => (
                      <button
                        key={connector.uid}
                        onClick={() => {
                          connect({ connector });
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-grimoire-ink hover:bg-grimoire-purple/5 hover:text-white transition-colors flex items-center gap-3"
                      >
                        <span className="w-2 h-2 rounded-full bg-grimoire-muted" />
                        {connector.name}
                      </button>
                    ))}
                  </div>
                )}

                {showMenu && connectors.length === 0 && (
                  <div className="absolute right-0 top-full mt-2 w-60 bg-grimoire-elevated border border-grimoire-border rounded-xl shadow-card p-4 z-50">
                    <p className="text-sm text-grimoire-muted">
                      No wallet detected. Install{" "}
                      <a href="https://metamask.io" target="_blank" rel="noopener noreferrer" className="text-grimoire-purple underline">
                        MetaMask
                      </a>{" "}
                      to continue.
                    </p>
                  </div>
                )}
              </div>
            )}

            {mounted && isConnected && address && (
              <div className="flex items-center gap-2">
                <Link
                  href={`/profile/${address}`}
                  className="hidden sm:inline-flex px-3 py-1.5 text-xs font-sans font-semibold text-grimoire-muted border border-grimoire-border rounded-lg hover:text-grimoire-gold hover:border-grimoire-gold/40 transition-colors"
                >
                  My NFTs
                </Link>
                <Link
                  href={`/profile/${address}`}
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-grimoire-elevated border border-grimoire-border rounded-lg hover:border-grimoire-purple/40 transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-grimoire-purple animate-pulse" />
                  <span className="font-mono text-xs text-grimoire-ink">
                    {truncateAddress(address)}
                  </span>
                </Link>
                <button
                  id="disconnect-wallet-btn"
                  onClick={() => disconnect()}
                  className="px-3 py-1.5 text-xs font-sans font-semibold text-grimoire-muted border border-grimoire-border rounded-lg hover:text-grimoire-crimson hover:border-grimoire-crimson/40 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 text-grimoire-muted hover:text-grimoire-gold transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                {mobileOpen ? (
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                ) : (
                  <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-grimoire-border bg-grimoire-elevated/95 backdrop-blur-md">
            <nav className="px-4 py-4 flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 text-sm font-sans font-medium text-grimoire-muted hover:text-grimoire-gold hover:bg-grimoire-surface/50 rounded-lg transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              {isConnected && address && (
                <Link
                  href={`/profile/${address}`}
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 text-sm font-sans font-medium text-grimoire-muted hover:text-grimoire-gold hover:bg-grimoire-surface/50 rounded-lg transition-colors"
                >
                  My NFTs
                </Link>
              )}
            </nav>
          </div>
        )}
      </header>
    </>
  );
}

"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { ritualChain } from "@/lib/chain";
import { useEffect, useRef, useState } from "react";

/** Truncates a wallet address to 0x1234…5678 format */
function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/** Header — logo + wallet connect button + chain guard */
export function Header() {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const [showMenu, setShowMenu] = useState(false);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isWrongChain = isConnected && chain?.id !== ritualChain.id;

  // Avoid SSR hydration mismatch for wallet state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showMenu]);

  return (
    <>
      {/* Wrong-chain banner — VISIBLE on all screen sizes (was hidden on mobile) */}
      {mounted && isWrongChain && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-yellow-500/10 border-b border-yellow-500/30 px-4 py-2 flex items-center justify-center gap-3 text-sm text-yellow-400">
          <span className="font-semibold">⚠ Wrong network detected</span>
          <button
            onClick={() => switchChain({ chainId: ritualChain.id })}
            disabled={isSwitching}
            className="px-3 py-0.5 text-xs font-semibold border border-yellow-400/50 rounded-lg hover:bg-yellow-400/10 transition-colors disabled:opacity-50"
          >
            {isSwitching ? "Switching…" : "Switch to Ritual Chain"}
          </button>
        </div>
      )}

      <header
        className={`fixed left-0 right-0 z-50 border-b border-gray-800/60 backdrop-blur-sm bg-black/80 transition-all duration-200 ${
          mounted && isWrongChain ? "top-10" : "top-0"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center overflow-hidden rounded-full">
              <img
                src="/ritual-logo.jpg"
                alt="Ritual Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-display text-white text-lg tracking-tight">
              The Mini Cauldron
            </span>
            <span className="hidden sm:inline-block px-2 py-0.5 text-xs font-mono text-ritual-green/70 border border-ritual-green/20 rounded bg-ritual-green/5">
              Chain 1979
            </span>
          </div>

          {/* Wallet area */}
          <div className="relative flex items-center gap-2">
            {/* Skeleton during SSR */}
            {!mounted && (
              <div className="h-9 w-32 rounded-lg border border-gray-800 bg-black/30 animate-pulse" />
            )}

            {/* Not connected */}
            {mounted && !isConnected && (
              <div className="relative" ref={menuRef}>
                <button
                  id="connect-wallet-btn"
                  onClick={() => setShowMenu(!showMenu)}
                  disabled={isPending}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-body font-semibold
                             text-ritual-green border border-ritual-green/50 rounded-lg
                             hover:bg-ritual-green/10 hover:border-ritual-green
                             transition-all duration-200 animate-pulse-green"
                >
                  <span className="w-2 h-2 rounded-full bg-ritual-green/50" />
                  {isPending ? "Connecting…" : "Connect Wallet"}
                </button>

                {/* Wallet picker dropdown */}
                {showMenu && connectors.length > 0 && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-ritual-elevated border border-gray-700 rounded-xl shadow-card overflow-hidden z-50">
                    <p className="px-4 py-2 text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
                      Choose Wallet
                    </p>
                    {connectors.map((connector) => (
                      <button
                        key={connector.uid}
                        onClick={() => {
                          connect({ connector });
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-ritual-green/5 hover:text-white transition-colors flex items-center gap-3"
                      >
                        <span className="w-2 h-2 rounded-full bg-gray-600" />
                        {connector.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* No wallets available message */}
                {showMenu && connectors.length === 0 && (
                  <div className="absolute right-0 top-full mt-2 w-60 bg-ritual-elevated border border-gray-700 rounded-xl shadow-card overflow-hidden z-50 p-4">
                    <p className="text-sm text-gray-400">
                      No wallet detected. Install{" "}
                      <a
                        href="https://metamask.io"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-ritual-green underline"
                      >
                        MetaMask
                      </a>{" "}
                      to continue.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Connected */}
            {mounted && isConnected && address && (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-ritual-elevated border border-gray-700 rounded-lg">
                  <span className="w-2 h-2 rounded-full bg-ritual-green animate-pulse" />
                  <span className="font-mono text-xs text-gray-300">
                    {truncateAddress(address)}
                  </span>
                </div>
                <button
                  id="disconnect-wallet-btn"
                  onClick={() => disconnect()}
                  className="px-3 py-1.5 text-xs font-body font-semibold text-gray-500 border border-gray-700 rounded-lg hover:text-ritual-red hover:border-red-500/40 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}

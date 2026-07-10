import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "The Living Grimoire -- AI-Powered NFT Storytelling on Ritual Chain",
  description:
    "Deploy NFT collections and transform them into living worlds. AI-generated lore, characters, locations, and stories on Ritual Chain.",
  keywords: [
    "NFT",
    "AI",
    "storytelling",
    "Ritual Chain",
    "blockchain",
    "web3",
    "Living Grimoire",
    "deploy",
    "ERC-721",
  ],
  openGraph: {
    title: "The Living Grimoire -- AI-Powered NFT Storytelling",
    description:
      "Deploy NFT collections and bring them to life with AI-generated narratives on Ritual Chain.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@9..144,300..900,30..100&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-grimoire-bg text-grimoire-ink font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

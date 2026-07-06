import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "The Living Grimoire — AI-Powered NFT Storytelling Marketplace",
  description:
    "Transform NFT collections into living worlds. AI-generated lore, characters, locations, and stories — bringing every NFT to life on Ritual Chain.",
  keywords: [
    "NFT",
    "AI",
    "storytelling",
    "marketplace",
    "Ritual Chain",
    "blockchain",
    "web3",
    "Living Grimoire",
    "NFT lore",
    "NFT stories",
  ],
  openGraph: {
    title: "The Living Grimoire — AI-Powered NFT Storytelling",
    description:
      "Every NFT has a story waiting to be told. Transform collections into living worlds with AI-generated narratives.",
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
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Crimson+Text:ital,wght@0,400;0,600;0,700;1,400&family=Barlow:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-grimoire-bg text-grimoire-ink font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

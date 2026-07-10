/** @type {import('next').NextConfig} */
const nextConfig = {
  // Silences the Turbopack/webpack conflict warning (Next.js 16+)
  turbopack: {},

  // Allow loading NFT images from IPFS gateways in <img> / next/image
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ipfs.io" },
      { protocol: "https", hostname: "cloudflare-ipfs.com" },
      { protocol: "https", hostname: "gateway.pinata.cloud" },
      { protocol: "https", hostname: "dweb.link" },
      { protocol: "https", hostname: "**.ipfs.nftstorage.link" },
    ],
  },
};

module.exports = nextConfig;

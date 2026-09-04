import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Default output (no `output: "standalone"`) — Vercel builds and hosts Next.js
  // natively; standalone is only for self-hosting/Docker.
  images: {
    // Product/hero images are served from Unsplash. Storefront cards currently
    // use plain <img>, but this allows next/image to optimise Unsplash URLs too.
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;

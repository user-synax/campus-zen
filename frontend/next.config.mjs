/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // ─── Image Optimization ──────────────────────────────────────────────────
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.appwrite.io" },
      { protocol: "https", hostname: "*.cloudflare.com" },
      { protocol: "https", hostname: "*.cloudflarestream.com" },
      { protocol: "https", hostname: "github.com" },
      { protocol: "https", hostname: "*.githubusercontent.com" },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },

  // ─── Static Asset Caching ────────────────────────────────────────────────
  async headers() {
    return [
      {
        // Service worker must never be cached — browsers check for updates
        // on every navigation when Cache-Control is no-cache.
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
      {
        // Cache static assets aggressively (immutable)
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Cache images for 1 hour
        source: "/_next/image/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        // Cache favicon and manifest
        source: "/:path*(ico|png|webmanifest|svg)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },

  // ─── Bundle Optimization ─────────────────────────────────────────────────
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
  },

  // ─── Compression ─────────────────────────────────────────────────────────
  compress: true,
};

export default nextConfig;

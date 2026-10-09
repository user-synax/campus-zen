/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== "production";

// ─── Content-Security-Policy ─────────────────────────────────────────────────
// Pragmatic enforced policy: 'self' + 'unsafe-inline' (required by Next.js
// hydration / framer-motion / styled-jsx). No 'unsafe-eval' in prod — it is
// only added in dev for Turbopack/HMR. Origins below match actual usage:
// backend API (NEXT_PUBLIC_API_URL), Appwrite storage, Cloudflare Stream,
// github-contributions-api, next/font (Google Fonts, self-hosted at build).
function buildApiOrigin() {
  const fallback = "http://localhost:4000";
  const raw = process.env.NEXT_PUBLIC_API_URL || fallback;
  try {
    return new URL(raw).origin;
  } catch {
    return fallback;
  }
}

const apiOrigin = buildApiOrigin();

const connectSrc = [
  "'self'",
  apiOrigin,
  "http://localhost:3000",
  "http://localhost:4000",
  "ws://localhost:*",
  "https://campuszen.tech",
  "https://*.campuszen.tech",
  "https://*.appwrite.io",
  "https://cloud.appwrite.io",
  "https://github-contributions-api.jogruber.de",
];

const scriptSrc = ["'self'", "'unsafe-inline'"];
if (isDev) scriptSrc.push("'unsafe-eval'");

const cspDirectives = [
  "default-src 'self'",
  `script-src ${scriptSrc.join(" ")}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://*.appwrite.io https://cloud.appwrite.io https://*.cloudflare.com https://*.cloudflarestream.com https://github.com https://*.githubusercontent.com",
  "media-src 'self' blob: https://*.appwrite.io https://cloud.appwrite.io https://*.cloudflare.com https://*.cloudflarestream.com",
  `connect-src ${[...new Set(connectSrc)].join(" ")}`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "frame-src 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
];

const cspHeader = cspDirectives.join("; ");

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

  // ─── Static Asset Caching + Security Headers ───────────────────────────────
  async headers() {
    return [
      {
        // Enforced CSP on every route (also covers /sw.js, static, images).
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspHeader,
          },
        ],
      },
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
    globalNotFound: true,
  },

  // ─── Compression ─────────────────────────────────────────────────────────
  compress: true,
};

export default nextConfig;

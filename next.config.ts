import type { NextConfig } from "next";

/**
 * `/public` files are served unhashed with `Cache-Control: public, max-age=0` (measured
 * on the production build), so every page view costs a conditional revalidation per
 * asset. Immutability removes those requests — and means a replaced asset must be
 * **renamed** (e.g. `og-2026.png`), never overwritten in place, or CDNs keep serving the
 * old bytes for a year.
 */
const immutableAsset = {
  key: "Cache-Control",
  value: "public, max-age=31536000, immutable",
};

const nextConfig: NextConfig = {
  async rewrites() {
    return [];
  },
  async headers() {
    return [
      { source: "/stemmsc.png", headers: [immutableAsset] },
      { source: "/og.png", headers: [immutableAsset] },
      { source: "/memberimage/:path*", headers: [immutableAsset] },
    ];
  },
  skipTrailingSlashRedirect: true,

  experimental: {
    // The blog slugs are prerendered at build (see `generateStaticParams`), and each
    // render opens its own queries. Supavisor loses responses once more than two
    // queries share a connection (`src/db/index.ts`), so the export workers are capped
    // well inside POOL_MAX instead of defaulting to one per CPU.
    staticGenerationMaxConcurrency: 2,
  },

  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31536000,
    // Nothing in `src/` renders a `next/image` wider than 64px, so these are the widths
    // a request may mint a cache key for. Keeping 1080/1200 out means a probe against
    // the Supabase `remotePattern` below cannot create unbounded optimizer work.
    deviceSizes: [640, 750],
    imageSizes: [24, 32, 48, 64, 96, 128, 256, 384],
    qualities: [75],
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ipmdyrxfptdsulfhxjkb.supabase.co",
        pathname: "/storage/v1/object/public/avatars/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;

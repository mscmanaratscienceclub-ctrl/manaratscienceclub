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

/**
 * `next/image` refuses any hostname that is not listed in `remotePatterns`, so the
 * offloaded media host has to be allow-listed as soon as `src/lib/media.ts` starts
 * minting URLs against it. Deriving the entry from the same env var the URL builders
 * read means the optimizer and the rendered URLs can never disagree about where
 * content images live.
 */
function externalMediaPatterns(host: string | undefined) {
  if (!host) return [];
  const url = new URL(host);
  return [
    {
      protocol: url.protocol.replace(/:$/, "") as "http" | "https",
      hostname: url.hostname,
      pathname: "/**",
    },
  ];
}

/**
 * The Supabase storage host, allow-listed from the same variable `src/lib/media.ts`
 * reads.
 *
 * It used to be a literal project hostname, which is how a project migration would
 * have silently left `next/image` refusing every avatar: the new project's host is
 * not the one compiled into `next.config.ts`. Two pathnames, because
 * `renderedImageUrl()` mints transform URLs as well as public object URLs, and a
 * pattern that covers only `object` makes the optimizer reject a legacy original.
 * Both stay scoped to `avatars`, so an outside probe cannot ask the CDN to resize
 * an arbitrary object.
 */
function supabaseMediaPatterns(host: string | undefined) {
  if (!host) return [];
  const url = new URL(host);
  const protocol = url.protocol.replace(/:$/, "") as "http" | "https";
  return ["object", "render/image"].map((kind) => ({
    protocol,
    hostname: url.hostname,
    pathname: `/storage/v1/${kind}/public/avatars/**`,
  }));
}

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
      ...supabaseMediaPatterns(process.env.NEXT_PUBLIC_SUPABASE_URL),
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      ...externalMediaPatterns(process.env.NEXT_PUBLIC_MEDIA_BASE_URL),
    ],
  },
};

export default nextConfig;

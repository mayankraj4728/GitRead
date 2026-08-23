import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin the tracing root to this project (multiple lockfiles exist on the machine).
  outputFileTracingRoot: __dirname,
  // Next 15 defaults the client-side Router Cache for dynamic pages to 0s, so
  // every revisit to Home / Library / a file re-runs the full server render and
  // re-flashes the loading skeleton — navigation never feels instant. These
  // routes are all dynamic (they read the auth cookie). Keeping them in the
  // browser's router cache for a couple of minutes makes back/forward and
  // re-navigation instant; content freshness is still handled server-side
  // (sha-pinned Redis cache) and by the in-reader "new commit" sync poll.
  experimental: {
    staleTimes: {
      dynamic: 120, // 2 min — instant revisits without going stale
      static: 300, // 5 min (Next's default) — kept explicit
    },
  },
  images: {
    // GitHub-hosted images (avatars, raw content, camo-proxied assets).
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "raw.githubusercontent.com" },
      { protocol: "https", hostname: "github.com" },
      { protocol: "https", hostname: "user-images.githubusercontent.com" },
      { protocol: "https", hostname: "camo.githubusercontent.com" },
      { protocol: "https", hostname: "*.githubusercontent.com" },
    ],
  },
  // shiki is heavy; keep it out of the server bundle graph.
  serverExternalPackages: ["shiki"],
};

export default nextConfig;

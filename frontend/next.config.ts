import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Playwright drives the dev server via 127.0.0.1; without this, Next blocks its dev resources and the page never hydrates.
  allowedDevOrigins: ["127.0.0.1"],
  output: "standalone",
  // Separate build/dev output dirs let two dev servers (authenticated + demo mode) run side by side in tests.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async redirects() { return [{ source: "/dashboard", destination: "/", permanent: false }]; },
};

export default nextConfig;

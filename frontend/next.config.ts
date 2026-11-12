import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Playwright drives the dev server via 127.0.0.1; without this, Next blocks its dev resources and the page never hydrates.
  allowedDevOrigins: ["127.0.0.1"],
  output: "standalone",
};

export default nextConfig;

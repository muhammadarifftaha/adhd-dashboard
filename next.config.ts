import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Pino (and its pretty transport) out of the bundle so its worker-thread
  // transport resolves from node_modules at runtime instead of being bundled.
  serverExternalPackages: ["pino", "pino-pretty"],
};

export default nextConfig;

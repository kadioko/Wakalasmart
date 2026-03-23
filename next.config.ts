import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  // Prisma client needs to be transpiled in some environments
  serverExternalPackages: ["@prisma/client", "prisma"],
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;

import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Vercel to bundle files from packages/ which live above this app's root
  experimental: {
    outputFileTracingRoot: path.join(__dirname, "../../"),
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ];
  },
};

export default nextConfig;

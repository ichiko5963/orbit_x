import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["firebase-admin"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "pbs.twimg.com",
      },
      {
        protocol: "https",
        hostname: "video.twimg.com",
      },
      {
        protocol: "https",
        hostname: "*.twimg.com",
      },
      {
        protocol: "https",
        hostname: "*.vxtwitter.com",
      },
    ],
  },
};

export default nextConfig;

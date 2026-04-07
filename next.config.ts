import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images-of-elements.com",
      },
      {
        protocol: "https",
        hostname: "media.tenor.com",
      },
    ],
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images-of-elements.com",
      },
    ],
  },
};

export default nextConfig;

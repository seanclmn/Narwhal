import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SIGNALING_SERVER: process.env.NEXT_PUBLIC_SIGNALING_SERVER,
  },
};

export default nextConfig;

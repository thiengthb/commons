import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Required by the Dockerfile: the runtime stage copies .next/standalone, which only exists with this.
  output: 'standalone',
};

export default nextConfig;

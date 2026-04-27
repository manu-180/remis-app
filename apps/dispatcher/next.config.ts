import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@remis/shared-types'],
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;

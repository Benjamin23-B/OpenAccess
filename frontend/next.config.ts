import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* Silence the 'multiple lockfiles detected' workspace root warning */
  outputFileTracingRoot: path.join(__dirname),
  allowedDevOrigins: ['openaccess.gces.net.in', '192.168.1.36', 'localhost', '127.0.0.1'],
  async rewrites() {
    return [
      {
        source: '/api/plan',
        destination: 'http://127.0.0.1:8001/api/plan',
      },
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8889/api/:path*',
      },
    ];
  },
};

export default nextConfig;

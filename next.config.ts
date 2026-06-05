import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow images from external sources
  images: {
    domains: ['costing-backend-8cow.onrender.com'],
  },

  // Environment variables exposed to browser
  env: {
    NEXT_PUBLIC_APP_NAME: 'Costing Tool — Manufacturing ERP',
    NEXT_PUBLIC_APP_VERSION: '1.0.0',
  },

  // Production optimizations
  compress: true,
  poweredByHeader: false,

  // Rewrites for API proxy (optional - removes CORS issues in production)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;

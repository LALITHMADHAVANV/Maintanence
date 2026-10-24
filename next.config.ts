import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/maintenance',
  allowedDevOrigins: [
    '192.168.31.176',
    '192.168.31.*',
    'localhost',
  ],
  async redirects() {
    return [
      // Redirect root domain to /maintenance
      {
        source: '/',
        destination: '/maintenance',
        basePath: false,
        permanent: false,
      },
      // Redirect un-prefixed /api calls to /maintenance/api
      {
        source: '/api/:path*',
        destination: '/maintenance/api/:path*',
        basePath: false,
        permanent: false,
      },
      // Redirect alternative spelling /maintanance to /maintenance
      {
        source: '/maintanance',
        destination: '/maintenance',
        basePath: false,
        permanent: false,
      },
      {
        source: '/maintanance/:path*',
        destination: '/maintenance/:path*',
        basePath: false,
        permanent: false,
      },
    ];
  },
};

export default nextConfig;

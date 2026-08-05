import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js';

/** @type {import('next').NextConfig} */
const baseConfig = {
  poweredByHeader: false,
};

export default function nextConfig(phase) {
  if (phase !== PHASE_DEVELOPMENT_SERVER) {
    return { ...baseConfig, output: 'export' };
  }

  return {
    ...baseConfig,
    async rewrites() {
      return {
        beforeFiles: [
          { source: '/api/:path*', destination: 'http://127.0.0.1:3100/api/:path*' },
          {
            source: '/integrations/:path*',
            destination: 'http://127.0.0.1:3100/integrations/:path*',
          },
        ],
        fallback: [{ source: '/:path*', destination: '/' }],
      };
    },
  };
}

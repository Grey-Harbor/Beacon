import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js';

/** @type {import('next').NextConfig} */
const baseConfig = {
  agentRules: false,
  poweredByHeader: false,
};

export default function nextConfig(phase) {
  if (phase !== PHASE_DEVELOPMENT_SERVER) {
    return {
      ...baseConfig,
      output: 'export',
      experimental: { cpus: 1 },
    };
  }

  return {
    ...baseConfig,
    // Keep Turbopack's development output away from Webpack's production
    // output. This prevents a build started immediately after `next dev`
    // from observing dev-worker artifacts during teardown.
    distDir: '.next-dev',
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

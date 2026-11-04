import type { NextConfig } from 'next';
const config: NextConfig = {
  agentRules: false,
  distDir: process.env.ORAN_TEST_RUN === '1' ? '.next-test' : '.next',
  // Browser test runs compile without Turbopack's saved dev cache. Over a cache that an earlier run left, Next 16.4 can
  // answer every HMR subscribe with "restart", so the page reloads forever (vercel/next.js#100251).
  experimental: { turbopackFileSystemCacheForDev: process.env.ORAN_TEST_RUN !== '1' },
  poweredByHeader: false,
  serverExternalPackages: ['pg'],
  async headers() {
    return [{ source: '/(.*)', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'same-origin' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ] }];
  },
};
export default config;

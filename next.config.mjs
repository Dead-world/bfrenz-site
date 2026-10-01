/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  async rewrites() {
    return [
      // Android app verification file (see app/api/assetlinks/route.js).
      { source: '/.well-known/assetlinks.json', destination: '/api/assetlinks' },
    ];
  },
  async headers() {
    return [
      // The service worker must never be cached, so updates reach people right away.
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }] },
    ];
  },
};

export default nextConfig;

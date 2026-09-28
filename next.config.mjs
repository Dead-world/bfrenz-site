/** @type {import('next').NextConfig} */
const nextConfig = {
  // sanitize-html pulls in postcss/htmlparser2; keep it as a plain Node dependency.
  serverExternalPackages: ['sanitize-html'],
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;

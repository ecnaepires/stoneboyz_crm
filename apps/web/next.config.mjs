/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@stoneboyz/api-client', '@stoneboyz/domain'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;

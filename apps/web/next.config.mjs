/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@stoneboyz/api-client', '@stoneboyz/domain'],
  experimental: {
    serverActions: {
      bodySizeLimit: '6mb',
    },
  },
};

export default nextConfig;

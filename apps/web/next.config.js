/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(process.env.NEXT_STANDALONE === 'true' ? { output: 'standalone' } : {}),
  transpilePackages: ['@peanut/ui', '@peanut/types', '@peanut/utils', '@peanut/validators'],
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    if (apiUrl.startsWith('/')) {
      return [];
    }

    // If NEXT_PUBLIC_API_URL ends with /api/v1, strip it to prevent double /api/v1/api/v1 in proxy path
    const baseApiUrl = apiUrl.endsWith('/api/v1') ? apiUrl.slice(0, -7) : apiUrl;
    
    return [
      {
        source: '/api/v1/:path*',
        destination: `${baseApiUrl}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@peanut/ui', '@peanut/types', '@peanut/utils', '@peanut/validators'],
};

module.exports = nextConfig;

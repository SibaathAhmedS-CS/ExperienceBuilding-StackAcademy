/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'images.contentstack.io',
      },
      {
        protocol: 'https',
        hostname: 'assets.contentstack.io',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      {
        protocol: 'https',
        hostname: 'commondatastorage.googleapis.com',
      },
    ],
  },
  env: {
    CONTENTSTACK_API_KEY: process.env.CONTENTSTACK_API_KEY,
    CONTENTSTACK_DELIVERY_TOKEN: process.env.CONTENTSTACK_DELIVERY_TOKEN,
    CONTENTSTACK_ENVIRONMENT: process.env.CONTENTSTACK_ENVIRONMENT,
    CONTENTSTACK_BRANCH: process.env.CONTENTSTACK_BRANCH || 'main',
  },
};

module.exports = nextConfig;

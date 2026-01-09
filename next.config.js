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
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  env: {
    CONTENTSTACK_API_KEY: process.env.CONTENTSTACK_API_KEY,
    CONTENTSTACK_DELIVERY_TOKEN: process.env.CONTENTSTACK_DELIVERY_TOKEN,
    CONTENTSTACK_ENVIRONMENT: process.env.CONTENTSTACK_ENVIRONMENT,
    CONTENTSTACK_BRANCH: process.env.CONTENTSTACK_BRANCH || 'main',
    // Live Preview Configuration
    CONTENTSTACK_PREVIEW_TOKEN: process.env.CONTENTSTACK_PREVIEW_TOKEN,
    CONTENTSTACK_PREVIEW_HOST: process.env.CONTENTSTACK_PREVIEW_HOST || 'rest-preview.contentstack.com',
    NEXT_PUBLIC_ENABLE_LIVE_PREVIEW: process.env.NEXT_PUBLIC_ENABLE_LIVE_PREVIEW || 'false',
    // Expose preview config to client-side
    NEXT_PUBLIC_CONTENTSTACK_PREVIEW_TOKEN: process.env.CONTENTSTACK_PREVIEW_TOKEN,
    NEXT_PUBLIC_CONTENTSTACK_PREVIEW_HOST: process.env.CONTENTSTACK_PREVIEW_HOST || 'rest-preview.contentstack.com',
  },
  // Suppress CSS preload warnings - this is a Next.js optimization warning
  // The warning appears when CSS is preloaded but not immediately used
  // It's safe to ignore in development
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

module.exports = nextConfig;

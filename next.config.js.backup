/** @type {import('next').NextConfig} */
const withNextIntl = require('next-intl/plugin')('./src/i18n/config.ts');

const nextConfig = {
  output: 'standalone',
  
  // En Next.js 15+, cuando usas el App Router y next-intl con middleware, 
  // es mejor NO definir el objeto i18n aquí si da problemas de redirección.
  
  skipTrailingSlashRedirect: true,

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },

  serverExternalPackages: [
    '@gear-js/api', 
    'bullmq', 
    'ioredis', 
    'ethers', 
    'viem', 
    'node-telegram-bot-api', 
    'tweetnacl',
    '@polkadot/api',
    '@polkadot/util',
    '@polkadot/util-crypto',
    '@polkadot/keyring'
  ],

  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  webpack: (config) => {
    return config;
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.grafana.net https://*.supabase.co https://*.algorand.org; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.grafana.net https://*.supabase.co https://*.algorand.org https://*.walletconnect.com;" }
        ]
      }
    ];
  },
}

module.exports = withNextIntl(nextConfig);

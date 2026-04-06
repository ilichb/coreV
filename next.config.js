/** @type {import('next').NextConfig} */
const withNextIntl = require('next-intl/plugin')('./src/i18n/config.ts');

const nextConfig = {
  output: 'standalone',
  // Configuración mínima para evitar problemas con Turbopack
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

  // Configuración básica de compilación
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  webpack: (config, { isServer }) => {
    // Deshabilitar temporalmente el plugin de Grafana Faro para evitar bucles de compilación
    // if (!isServer && process.env.NODE_ENV === 'production' && process.env.GRAFANA_API_KEY) {
    //   const FaroSourceMapUploaderPlugin = require('@grafana/faro-webpack-plugin');
    //   config.plugins.push(
    //     new FaroSourceMapUploaderPlugin({
    //       appName: 'AndromedaCore',
    //       endpoint: 'https://faro-api-prod-eu-central-0.grafana.net/faro/api/v1',
    //       appId: '244',
    //       stackId: '1522452',
    //       verbose: true,
    //       apiKey: process.env.GRAFANA_API_KEY,
    //       gzipContents: true,
    //     })
    //   );
    // }
    return config;
  },
  async headers() {

    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.grafana.net https://*.supabase.co https://*.algorand.org; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.grafana.net https://*.supabase.co https://*.algorand.org https://*.walletconnect.com;"
          }
        ]
      }
    ];
  },
}

module.exports = withNextIntl(nextConfig);


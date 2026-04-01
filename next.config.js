/** @type {import('next').NextConfig} */
const withNextIntl = require('next-intl/plugin')('./src/i18n/config.ts');

const nextConfig = {
  output: 'standalone',
  // Configuración mínima para evitar problemas con Turbopack
  serverExternalPackages: ['@gear-js/api', 'bullmq', 'ioredis', 'ethers', 'viem', 'node-telegram-bot-api', 'tweetnacl'],

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
}

module.exports = withNextIntl(nextConfig);

/** @type {import('next').NextConfig} */
const withNextIntl = require('next-intl/plugin')('./src/i18n/config.ts');

const nextConfig = {
  output: 'standalone',
  // Configuración mínima para evitar problemas con Turbopack
  serverExternalPackages: ['@gear-js/api', 'bullmq', 'ioredis', 'ethers', 'viem', 'node-telegram-bot-api', 'tweetnacl'],

  // Deshabilitar características experimentales problemáticas
  experimental: {},

  // Configuración básica de compilación
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
}

module.exports = withNextIntl(nextConfig);

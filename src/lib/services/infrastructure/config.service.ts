/**
 * ConfigService
 * Centralized environment variable validation and access for enterprise hardening.
 * Prevents application startup/runtime errors by verifying all mandatory keys.
 */

export interface SystemConfig {
  mongodb: {
    uri: string;
  };
  supabase: {
    url: string;
    anonKey: string;
    serviceRole: string;
  };
  redis: {
    url: string;
    upstashUrl?: string;
    upstashToken?: string;
  };
  grafana?: {
    faroUrl?: string;
    faroAppName?: string;
    apiKey?: string;
  };
  rootstock: {
    enabled: boolean;
    rpcUrl: string;
  };
  arbitrum: {
    enabled: boolean;
    rpcUrl: string;
  };
  optimism: {
    enabled: boolean;
    rpcUrl: string;
  };
  tally: {
    apiKey: string;
  };
  env: 'development' | 'production' | 'test';
}

export class ConfigService {
  private static instance: SystemConfig;

  private static mandatoryKeys = [
    'MONGODB_URI',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'REDIS_URL',
    'ROOTSTOCK_RPC_URL',
    'ARBITRUM_RPC_URL',
    'OPTIMISM_RPC_URL',
    'TALLY_API_KEY',
    'THEGRAPH_API_KEY',
    'PINATA_API_KEY',
    'PINATA_API_SECRET',
    'TELEGRAM_BOT_TOKEN_CORE',
    'DISCORD_WEBHOOK_URL',
    'NEXT_PUBLIC_GRAFANA_FARO_URL',
    'NEXT_PUBLIC_GRAFANA_FARO_APP_NAME'
  ];

  static get(): SystemConfig {
    if (this.instance) return this.instance;

    // Validate mandatory keys
    const missingKeys = this.mandatoryKeys.filter(key => !process.env[key]);
    
    if (missingKeys.length > 0 && process.env.NODE_ENV === 'production') {
      throw new Error(`CRITICAL: Missing mandatory environment variables: ${missingKeys.join(', ')}`);
    }

    this.instance = {
      mongodb: {
        uri: process.env.MONGODB_URI || '',
      },
      supabase: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        serviceRole: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      },
      redis: {
        url: process.env.REDIS_URL || '',
        upstashUrl: process.env.UPSTASH_REDIS_REST_URL,
        upstashToken: process.env.UPSTASH_REDIS_REST_TOKEN,
      },
      grafana: {
        faroUrl: process.env.NEXT_PUBLIC_GRAFANA_FARO_URL,
        faroAppName: process.env.NEXT_PUBLIC_GRAFANA_FARO_APP_NAME,
        apiKey: process.env.GRAFANA_API_KEY,
      },
      rootstock: {
        enabled: process.env.ROOTSTOCK_ENABLED === 'true',
        rpcUrl: process.env.ROOTSTOCK_RPC_URL || 'https://public-node.rsk.co',
      },
      arbitrum: {
        enabled: process.env.ARBITRUM_ENABLED === 'true',
        rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
      },
      optimism: {
        enabled: process.env.OPTIMISM_ENABLED === 'true',
        rpcUrl: process.env.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io',
      },
      tally: {
        apiKey: process.env.TALLY_API_KEY || '',
      },
      env: (process.env.NODE_ENV as any) || 'development',
    };

    return this.instance;
  }

  static isProduction(): boolean {
    return this.get().env === 'production';
  }
}

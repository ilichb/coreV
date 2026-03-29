// Configuración centralizada para todos los conectores

export interface EcosystemConfig {
  name: string;
  enabled: boolean;
  priority: number;
  pollingInterval: number;
  rpcUrl: string;
  contractAddresses: {
    governor: string;
    token: string;
    timelock?: string;
  };
  graphqlEndpoint?: string;
  apiKeys?: Record<string, string>;
}

export const ecosystemConfigs: Record<string, EcosystemConfig> = {
  rootstock: {
    name: 'rootstock',
    enabled: process.env.ROOTSTOCK_ENABLED === 'true',
    priority: 1,
    pollingInterval: parseInt(process.env.ROOTSTOCK_POLLING_INTERVAL || '60000'),
    rpcUrl: process.env.ROOTSTOCK_RPC_URL || 'https://public-node.rsk.co',
    contractAddresses: {
      governor: process.env.ROOTSTOCK_GOVERNOR_ADDRESS || '',
      token: process.env.ROOTSTOCK_TOKEN_ADDRESS || '',
    },
    graphqlEndpoint: process.env.ROOTSTOCK_GRAPHQL_URL,
  },
  optimism: {
    name: 'optimism',
    enabled: process.env.OPTIMISM_ENABLED === 'true',
    priority: 2,
    pollingInterval: parseInt(process.env.OPTIMISM_POLLING_INTERVAL || '60000'),
    rpcUrl: process.env.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io',
    contractAddresses: {
      governor: process.env.OPTIMISM_GOVERNOR_ADDRESS || '',
      token: process.env.OPTIMISM_TOKEN_ADDRESS || '',
    },
  },
  arbitrum: {
    name: 'arbitrum',
    enabled: process.env.ARBITRUM_ENABLED === 'true',
    priority: 3,
    pollingInterval: parseInt(process.env.ARBITRUM_POLLING_INTERVAL || '60000'),
    rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
    contractAddresses: {
      governor: process.env.ARBITRUM_GOVERNOR_ADDRESS || '',
      token: process.env.ARBITRUM_TOKEN_ADDRESS || '',
    },
  }
};

export function getEnabledEcosystems(): string[] {
  return Object.entries(ecosystemConfigs)
    .filter(([_, config]) => config.enabled)
    .sort((a, b) => a[1].priority - b[1].priority)
    .map(([name]) => name);
}

export function getEcosystemConfig(ecosystem: string): EcosystemConfig | null {
  return ecosystemConfigs[ecosystem] || null;
}

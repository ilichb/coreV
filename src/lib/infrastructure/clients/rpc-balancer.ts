import * as https from 'https';
import { URL } from 'url';
import { logger } from '../../utils/logger';

export interface RPCEndpoint {
    url: string;
    weight: number;
    health: number; // 0-100
    latency: number; // ms
    lastSuccess: number;
    failureCount: number;
}

export interface RPCCallOptions {
    method: string;
    params: any[];
    timeout?: number;
    retries?: number;
}

export class RPCBalancer {
    private endpoints: RPCEndpoint[];
    private healthCheckInterval: NodeJS.Timeout;
    private requestCounter: number = 0;

    constructor(endpoints: { url: string; weight?: number }[]) {
        this.endpoints = endpoints.map(ep => ({
            url: ep.url,
            weight: ep.weight || 1,
            health: 100,
            latency: 0,
            lastSuccess: Date.now(),
            failureCount: 0
        }));

        // Health check every 60 seconds
        this.healthCheckInterval = setInterval(() => this.performHealthChecks(), 60000);
    }

    async call<T = any>(options: RPCCallOptions): Promise<T> {
        const selectedEndpoint = this.selectEndpoint();
        const startTime = Date.now();

        try {
            const result = await this.executeRpcCall(selectedEndpoint.url, options);
            const latency = Date.now() - startTime;

            this.updateEndpointHealth(selectedEndpoint, true, latency);
            return result;
        } catch (error) {
            const latency = Date.now() - startTime;
            this.updateEndpointHealth(selectedEndpoint, false, latency);

            // Retry with next endpoint if retries remain
            if (options.retries && options.retries > 0) {
                logger.warn(`RPC call failed, retrying... (${options.retries} left)`);
                return this.call({ ...options, retries: options.retries - 1 });
            }

            throw error;
        }
    }

    private selectEndpoint(): RPCEndpoint {
        // Weighted selection based on health and weight
        const validEndpoints = this.endpoints.filter(ep => ep.health > 50);

        if (validEndpoints.length === 0) {
            // Fallback to any endpoint
            return this.endpoints[Math.floor(Math.random() * this.endpoints.length)];
        }

        // Calculate total weight
        const totalWeight = validEndpoints.reduce((sum, ep) => sum + (ep.health * ep.weight), 0);
        let random = Math.random() * totalWeight;

        for (const endpoint of validEndpoints) {
            const weight = endpoint.health * endpoint.weight;
            if (random < weight) return endpoint;
            random -= weight;
        }

        return validEndpoints[0];
    }

    private async executeRpcCall(url: string, options: RPCCallOptions): Promise<any> {
        const postData = JSON.stringify({
            jsonrpc: '2.0',
            id: this.requestCounter++,
            method: options.method,
            params: options.params
        });

        const rpcUrl = new URL(url);
        const headers = {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData).toString()
        };

        const requestOptions = {
            hostname: rpcUrl.hostname,
            port: rpcUrl.port || 443,
            path: rpcUrl.pathname + rpcUrl.search,
            method: 'POST',
            headers: headers,
            timeout: options.timeout || 30000,
            family: 4 // Force IPv4
        };

        return new Promise((resolve, reject) => {
            const req = https.request(requestOptions, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            const result = JSON.parse(data);
                            if (result.error) {
                                reject(new Error(`RPC error: ${result.error.message}`));
                            } else {
                                resolve(result.result);
                            }
                        } catch (e) {
                            reject(new Error(`Failed to parse RPC response: ${data.substring(0, 100)}`));
                        }
                    } else {
                        reject(new Error(`RPC HTTP error: ${res.statusCode}`));
                    }
                });
            });

            req.on('error', (e) => reject(e));
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('RPC request timeout'));
            });
            req.write(postData);
            req.end();
        });
    }

    private updateEndpointHealth(endpoint: RPCEndpoint, success: boolean, latency: number): void {
        // Update latency (exponential moving average)
        endpoint.latency = endpoint.latency
            ? endpoint.latency * 0.7 + latency * 0.3
            : latency;

        if (success) {
            endpoint.health = Math.min(100, endpoint.health + 10);
            endpoint.lastSuccess = Date.now();
            endpoint.failureCount = 0;
        } else {
            endpoint.health = Math.max(0, endpoint.health - 30);
            endpoint.failureCount++;
        }
    }

    private async performHealthChecks(): Promise<void> {
        for (const endpoint of this.endpoints) {
            try {
                const startTime = Date.now();
                await this.executeRpcCall(endpoint.url, {
                    method: 'eth_blockNumber',
                    params: [],
                    timeout: 5000
                });
                const latency = Date.now() - startTime;
                this.updateEndpointHealth(endpoint, true, latency);
            } catch (error) {
                this.updateEndpointHealth(endpoint, false, 0);
            }
        }
    }

    getStatus(): RPCEndpoint[] {
        return this.endpoints.map(ep => ({ ...ep }));
    }

    destroy(): void {
        clearInterval(this.healthCheckInterval);
    }
}

// Factory function for ecosystem-specific balancers
export function createEcosystemRPCBalancer(ecosystem: string): RPCBalancer {
    const endpointConfigs: Record<string, { url: string; weight: number }[]> = {
        rootstock: [
            { url: 'https://public-node.rsk.co', weight: 1 },
            { url: 'https://mainnet.sovryn.app/rpc', weight: 1 }, // Added a known working secondary
            { url: process.env.ROOTSTOCK_RPC_PREMIUM || '', weight: 2 }
        ],
        optimism: [
            { url: 'https://mainnet.optimism.io', weight: 1 },
            { url: 'https://optimism.publicnode.com', weight: 1 }
        ],
        arbitrum: [
            { url: 'https://arb1.arbitrum.io/rpc', weight: 1 },
            { url: 'https://arbitrum.publicnode.com', weight: 1 }
        ]
    };

    const endpoints = endpointConfigs[ecosystem] || [];
    return new RPCBalancer(endpoints.filter(ep => ep.url));
}

export const rpcBalancer = createEcosystemRPCBalancer('rootstock');

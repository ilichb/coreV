import * as https from 'https';
import { URL } from 'url';
import { logger } from '../../utils/logger';

export interface TheGraphQuery {
  query: string;
  variables?: Record<string, any>;
  operationName?: string;
}

export interface TheGraphResponse<T = any> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export class TheGraphClient {
  private apiKey: string;
  private endpoint: string;
  private rateLimitQueue: Array<() => Promise<any>> = [];
  private processing = false;
  private lastRequestTime = 0;
  private readonly REQUEST_INTERVAL = 100; // 100ms between requests

  constructor(endpoint: string, apiKey?: string) {
    this.endpoint = endpoint;
    this.apiKey = apiKey || '';
  }

  async query<T = any>(query: string | TheGraphQuery, variables?: Record<string, any>): Promise<T> {
    const queryObj: TheGraphQuery = typeof query === 'string' ? { query, variables } : query;

    return new Promise((resolve, reject) => {
      this.rateLimitQueue.push(async () => {
        try {
          const result = await this.executeQuery<T>(queryObj);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.rateLimitQueue.length === 0) return;

    this.processing = true;

    while (this.rateLimitQueue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;

      if (timeSinceLastRequest < this.REQUEST_INTERVAL) {
        await new Promise(resolve =>
          setTimeout(resolve, this.REQUEST_INTERVAL - timeSinceLastRequest)
        );
      }

      const request = this.rateLimitQueue.shift();
      if (request) {
        try {
          await request();
        } catch (error) {
          logger.error('TheGraph request failed:', error);
        }
      }

      this.lastRequestTime = Date.now();
    }

    this.processing = false;
  }

  private async executeQuery<T>(query: TheGraphQuery): Promise<T> {
    const postData = JSON.stringify(query);
    const url = new URL(this.endpoint);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData).toString(),
      'Origin': 'https://andromedacomputer.net',
      'Referer': 'https://andromedacomputer.net/',
      'User-Agent': 'Mozilla/5.0 (Node.js)'
    };

    if (this.apiKey) {
      if (this.endpoint.includes('tally.xyz')) {
        headers['Api-Key'] = this.apiKey;
      } else {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }
    }

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: headers,
      timeout: 60000,
      family: 4 // Force IPv4
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const result = JSON.parse(data) as TheGraphResponse<T>;
              if (result.errors && result.errors.length > 0) {
                reject(new Error(`TheGraph query errors: ${result.errors.map(e => e.message).join(', ')}`));
              } else if (!result.data) {
                reject(new Error('TheGraph returned no data'));
              } else {
                resolve(result.data);
              }
            } catch (e) {
              reject(new Error(`Failed to parse TheGraph response: ${data.substring(0, 100)}`));
            }
          } else {
            reject(new Error(`TheGraph API error: ${res.statusCode} ${res.statusMessage}`));
          }
        });
      });

      req.on('error', (e) => reject(e));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('TheGraph request timeout'));
      });
      req.write(postData);
      req.end();
    });
  }
}

export const GOVERNANCE_QUERIES = {
  rootstock: `
    query GetRootstockProposals($first: Int = 100, $skip: Int = 0) {
      proposals(
        first: $first,
        skip: $skip,
        orderBy: createdAt,
        orderDirection: desc
      ) {
        id
        proposalId
        proposer { id }
        description
        createdAt
        votesFor
        votesAgainst
        votesAbstains
        votesTotal
        state
      }
    }
  `,
  optimism: `
    query GetOptimismProposals($first: Int = 100, $skip: Int = 0) {
      proposals(
        first: $first,
        skip: $skip,
        orderBy: createdTimestamp,
        orderDirection: desc
      ) {
        id
        proposer
        description
        targets
        values
        signatures
        calldatas
        createdTimestamp
        startBlock
        endBlock
        proposalThreshold
        quorumVotes
        forVotes
        againstVotes
        abstainVotes
        canceled
        executed
        state
      }
    }
  `,
  arbitrum: `
    query GetArbitrumProposals($first: Int = 100, $skip: Int = 0) {
      proposals(
        first: $first,
        skip: $skip,
        orderBy: createdTimestamp,
        orderDirection: desc
      ) {
        id
        proposer
        description
        targets
        values
        signatures
        calldatas
        createdTimestamp
        startBlock
        endBlock
        proposalThreshold
        quorumVotes
        forVotes
        againstVotes
        abstainVotes
        canceled
        executed
        state
      }
    }
  `
};

export const theGraphClient = new TheGraphClient(
  process.env.ROOTSTOCK_GRAPHQL_URL || 'https://api.thegraph.com/subgraphs/name/tally/rootstock-governance',
  process.env.THEGRAPH_API_KEY
);

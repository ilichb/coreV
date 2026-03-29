import * as https from 'https';
import { URL } from 'url';
import { logger } from '../../utils/logger';

export interface PinataPinResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

export interface PinataPinJSONOptions {
  pinataContent: any;
  pinataMetadata?: {
    name?: string;
    keyvalues?: Record<string, string>;
  };
  pinataOptions?: {
    cidVersion?: 0 | 1;
  };
}

export class PinataService {
  private static instance: PinataService;
  private jwt: string;

  private constructor() {
    this.jwt = process.env.PINATA_JWT || '';
    if (!this.jwt) {
      logger.warn('PINATA_JWT environment variable is not set');
    }
  }

  public static getInstance(): PinataService {
    if (!PinataService.instance) {
      PinataService.instance = new PinataService();
    }
    return PinataService.instance;
  }

  async pinJSON(content: any, metadata?: { name?: string }): Promise<PinataPinResponse> {
    const jwt = this.jwt;
    if (!jwt) {
      throw new Error('PINATA_JWT is not defined');
    }

    const postData = JSON.stringify({
      pinataContent: content,
      pinataMetadata: metadata || { name: `pinata-upload-${Date.now()}.json` },
      pinataOptions: { cidVersion: 0 }
    });

    const url = new URL('https://api.pinata.cloud/pinning/pinJSONToIPFS');
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`,
        'Content-Length': Buffer.byteLength(postData).toString()
      },
      timeout: 30000,
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch (error) {
              reject(new Error(`Failed to parse Pinata response: ${data.substring(0, 100)}`));
            }
          } else {
            reject(new Error(`Pinata API error: ${res.statusCode} ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Pinata upload timeout (30s)'));
      });
      req.write(postData);
      req.end();
    });
  }

  async pinFile(buffer: Buffer, filename: string): Promise<PinataPinResponse> {
    // Implementación simplificada - en producción usarías FormData y fetch/axios
    throw new Error('pinFile not implemented - use pinJSON for JSON data');
  }

  async testAuthentication(): Promise<boolean> {
    try {
      const jwt = this.jwt;
      if (!jwt) return false;

      const url = new URL('https://api.pinata.cloud/data/testAuthentication');
      const options = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${jwt}`
        },
        timeout: 10000,
      };

      return new Promise((resolve) => {
        const req = https.request(options, (res) => {
          resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => resolve(false));
        req.end();
      });
    } catch {
      return false;
    }
  }
}

export const pinata = PinataService.getInstance();
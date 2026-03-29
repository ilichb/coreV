import * as https from 'https';
import { URL } from 'url';
import { logger } from '../../utils/logger';

export interface IPFSUploadResult {
  cid: string;
  url: string;
  size: number;
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function uploadScorecardToIPFS(scorecard: any, retries = 3): Promise<IPFSUploadResult> {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) throw new Error('PINATA_JWT is not defined');

  const postData = JSON.stringify({
    pinataContent: scorecard,
    pinataMetadata: { name: `andromeda-scorecard-${Date.now()}.json` }
  });

  logger.info(`📤 Sending ${Buffer.byteLength(postData)} bytes to Pinata...`);

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
    timeout: 60000,
    family: 4 // Force IPv4 to avoid potential dual-stack issues in some environments
  };

  for (let attempt = 1; attempt <= (retries || 3); attempt++) {
    try {
      return await new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              try {
                const result = JSON.parse(data);
                logger.info(`✅ Pinata successful: ${result.IpfsHash}`);
                resolve({
                  cid: result.IpfsHash,
                  url: `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`,
                  size: result.PinSize
                });
              } catch (e) {
                reject(new Error(`Failed to parse Pinata response: ${data.substring(0, 100)}`));
              }
            } else {
              reject(new Error(`Pinata API error: ${res.statusCode} ${data}`));
            }
          });
        });

        req.on('error', (e) => reject(e));
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('IPFS upload timeout (60s)'));
        });
        req.write(postData);
        req.end();
      });
    } catch (error: any) {
      logger.warn(`⚠️ IPFS upload attempt ${attempt} failed: ${error.message}`);
      if (attempt === retries) throw error;
      const backoff = Math.pow(2, attempt) * 1000;
      logger.info(`⏳ Retrying in ${backoff}ms...`);
      await sleep(backoff);
    }
  }
  throw new Error('IPFS upload failed after all retries');
}

export async function getFromIPFS(cid: string): Promise<any> {
  const url = new URL(`https://gateway.pinata.cloud/ipfs/${cid}`);
  const options = {
    hostname: url.hostname,
    port: 443,
    path: url.pathname,
    method: 'GET',
    timeout: 30000,
    family: 4 // Force IPv4
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try { resolve(JSON.parse(data)); }
          catch (e) { reject(new Error('Failed to parse IPFS data')); }
        } else { reject(new Error(`IPFS fetch error: ${res.statusCode}`)); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('IPFS get timeout')); });
    req.end();
  });
}

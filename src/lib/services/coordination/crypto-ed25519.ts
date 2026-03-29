import nacl from 'tweetnacl';
import { parseDid } from '@/types/coordination/scorecard';

export interface Ed25519VerifyResult {
  isValid: boolean;
  publicKey?: string;
  error?: string;
}

export function verifyEd25519Signature(
  did: string,
  signatureHex: string,
  message: string
): Ed25519VerifyResult {
  try {
    const didParts = parseDid(did);
    
    if (didParts.chain !== 'sol') {
      return {
        isValid: false,
        error: 'DID chain must be sol for Ed25519'
      };
    }

    const publicKeyBytes = Buffer.from(didParts.address, 'hex');
    const signatureBytes = Buffer.from(signatureHex, 'hex');
    const messageBytes = Buffer.from(message, 'utf8');

    if (publicKeyBytes.length !== 32) {
      return {
        isValid: false,
        error: 'Invalid public key length (expected 32 bytes)'
      };
    }

    if (signatureBytes.length !== 64) {
      return {
        isValid: false,
        error: 'Invalid signature length (expected 64 bytes)'
      };
    }

    const isValid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    );

    return {
      isValid,
      publicKey: didParts.address
    };
  } catch (error: any) {
    return {
      isValid: false,
      error: error.message
    };
  }
}

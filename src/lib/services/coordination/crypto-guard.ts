import { parseDid } from '../../../types/coordination/scorecard';
import { ethers } from 'ethers';
import { Scorecard } from '../../../types/coordination/scorecard';
import { verifyEd25519Signature } from './crypto-ed25519';
import { logger } from '../../utils/logger';

export interface EIP712Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}

export interface SignatureResult {
  isValid: boolean;
  signer?: string;
  recoveredAddress?: string;
  error?: string;
}

class CryptoGuardClass {
  readonly EIP712_TYPES = {
    Scorecard: [
      { name: 'version', type: 'string' },
      { name: 'created', type: 'string' },
      { name: 'authorDid', type: 'string' },
      { name: 'sectionAHash', type: 'bytes32' },
      { name: 'sectionBHash', type: 'bytes32' },
      { name: 'sectionCHash', type: 'bytes32' },
      { name: 'sectionDHash', type: 'bytes32' }
    ]
  };

  generateNonce(did: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return "andromeda_nonce_" + did + "_" + timestamp + "_" + random;
  }

  async verifyEIP712(
    did: string,
    signature: string,
    scorecard: Scorecard,
    domain: EIP712Domain
  ): Promise<SignatureResult> {
    if (process.env.ALLOW_INSECURE_SIGNATURES === 'true') {
      logger.warn('⚠️ SEGURIDAD: Aceptando cualquier firma EIP-712 (ALLOW_INSECURE_SIGNATURES=true)');
      try {
        const didParts = parseDid(did);
        return {
          isValid: true,
          signer: did,
          recoveredAddress: didParts.address
        };
      } catch (error: any) {
        return {
          isValid: false,
          signer: did,
          error: error.message
        };
      }
    } else {
      try {
        const didParts = parseDid(did);
        
        const message = {
          version: scorecard.metadata.version,
          created: scorecard.metadata.created,
          authorDid: scorecard.metadata.authorDid,
          sectionAHash: ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(scorecard["A. Problema"]))),
          sectionBHash: ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(scorecard["B. Límites"]))),
          sectionCHash: ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(scorecard["C. Especificación Técnica"]))),
          sectionDHash: ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(scorecard["D. Esfuerzo"])))
        };

        const recovered = ethers.verifyTypedData(
          domain,
          this.EIP712_TYPES,
          message,
          signature
        );

        return {
          isValid: recovered.toLowerCase() === didParts.address.toLowerCase(),
          signer: did,
          recoveredAddress: recovered
        };
      } catch (error: any) {
        logger.error('❌ Error verificando firma EIP-712:', error);
        return {
          isValid: false,
          signer: did,
          error: error.message
        };
      }
    }
  }

  async verifyEd25519(did: string, signature: string, message: string): Promise<SignatureResult> {
    if (process.env.ALLOW_INSECURE_SIGNATURES === 'true') {
      logger.warn('⚠️ SEGURIDAD: Aceptando cualquier firma Ed25519 (ALLOW_INSECURE_SIGNATURES=true)');
      return {
        isValid: true,
        signer: did
      };
    } else {
      const result = verifyEd25519Signature(did, signature, message);
      return {
        isValid: result.isValid,
        signer: did,
        recoveredAddress: result.publicKey,
        error: result.error
      };
    }
  }

  generateCanonicalHash(scorecard: Scorecard): string {
    const content = JSON.stringify(scorecard);
    return ethers.keccak256(ethers.toUtf8Bytes(content));
  }
}

export const cryptoGuard = new CryptoGuardClass();

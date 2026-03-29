// Versión producción - verificaciones reales
import { ethers } from 'ethers';
import { logger } from '../../utils/logger';

export async function verifyEIP712Real(
  did: string, 
  signature: string, 
  message: string
): Promise<boolean> {
  // Implementación real con ethers.js
  try {
    const recovered = ethers.verifyMessage(message, signature);
    const parts = did.split(':');
    const didAddress = parts.length >= 4 ? parts[3] : null;
    
    if (!didAddress) {
      logger.error('Invalid DID format, missing address:', did);
      return false;
    }
    
    return recovered.toLowerCase() === didAddress.toLowerCase();
  } catch (error) {
    logger.error('Error verifying EIP-712:', error);
    return false;
  }
}

/**
 * Adapter para integrar Andromeda Core con AVIP v2.0
 * Convierte scorecards en batches de AVIPRegistry
 */

import { ethers } from 'ethers';
import { logger } from '../../utils/logger';

export interface AVIPConfig {
  rpcUrl: string;
  contractAddress: string;
  privateKey?: string;
}

export class AVIPAdapter {
  private provider: ethers.JsonRpcProvider;
  private contractAddress: string;
  private signer?: ethers.Wallet;

  constructor(config: AVIPConfig) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.contractAddress = config.contractAddress;

    if (config.privateKey) {
      this.signer = new ethers.Wallet(config.privateKey, this.provider);
    }
  }

  /**
   * Convierte un scorecard de Andromeda en batch de AVIP
   */
  async submitScorecardToAVIP(scorecard: any): Promise<{
    success: boolean;
    batchId?: string;
    txHash?: string;
    error?: string;
    estimatedGas?: string;
  }> {
    try {
      if (!this.signer) {
        throw new Error('AVIP_PRIVATE_KEY not configured');
      }

      const abi = [
        "function submitBatch(bytes32 merkleRoot, bytes32 mmrRoot, uint256 itemCount, bytes32 previousBatchId) external returns (bytes32)",
        "function getLatestBatch() external view returns (bytes32)",
        "event BatchSubmitted(bytes32 indexed batchId, bytes32 indexed merkleRoot, bytes32 mmrRoot, address indexed submitter, uint256 timestamp, uint256 itemCount, bytes32 previousBatchId)"
      ];

      const contract = new ethers.Contract(this.contractAddress, abi, this.signer);

      // 1. Calcular Merkle root del scorecard
      const merkleRoot = this.calculateMerkleRoot(scorecard);

      // 2. Obtener último batch para chain integrity
      const latestBatchId = await contract.getLatestBatch();

      // 3. Estimar gas
      let gasEstimate: bigint;
      try {
        gasEstimate = await contract.submitBatch.estimateGas(
          merkleRoot,
          ethers.keccak256(ethers.toUtf8Bytes('avip-mmr-' + Date.now())),
          1,
          latestBatchId === ethers.ZeroHash ? ethers.ZeroHash : latestBatchId
        );
      } catch (e: any) {
        logger.warn('⚠️ Gas estimation failed, using fallback:', e.message);
        gasEstimate = 300000n; // Fallback sensible
      }

      // 4. Enviar transacción con un buffer del 20%
      const tx = await contract.submitBatch(
        merkleRoot,
        ethers.keccak256(ethers.toUtf8Bytes('avip-mmr-' + Date.now())),
        1,
        latestBatchId === ethers.ZeroHash ? ethers.ZeroHash : latestBatchId,
        { gasLimit: (gasEstimate * 120n) / 100n }
      );

      const receipt = await tx.wait();

      // 5. Extraer batchId del evento
      const event = receipt?.logs.find((log: any) => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed?.name === 'BatchSubmitted';
        } catch {
          return false;
        }
      });

      let batchId: string | undefined = undefined;
      if (event) {
        const parsedLog = contract.interface.parseLog(event as any);
        batchId = parsedLog?.args ? parsedLog.args.batchId : undefined;
      }

      return {
        success: true,
        batchId: batchId || undefined,
        txHash: receipt?.hash || undefined,
        estimatedGas: gasEstimate.toString()
      };

    } catch (error: any) {
      logger.error('❌ AVIP submission error:', error);
      return {
        success: false,
        error: error.message || 'Unknown AVIP error'
      };
    }
  }

  /**
   * Verifica si un scorecard está registrado en AVIP
   */
  async verifyScorecardInAVIP(scorecardId: string): Promise<{
    registered: boolean;
    batchId?: string;
  }> {
    return {
      registered: false
    };
  }

  private calculateMerkleRoot(data: any): string {
    // Para v2.0 usamos keccak256 de los datos normalizados
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    return ethers.keccak256(ethers.toUtf8Bytes(dataString));
  }
}

/**
 * Instancia global para usar en endpoints
 */
export const avipAdapter = new AVIPAdapter({
  rpcUrl: process.env.AVIP_RPC_URL || 'http://localhost:8545',
  contractAddress: process.env.AVIP_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  privateKey: process.env.AVIP_PRIVATE_KEY
});

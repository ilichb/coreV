import { algorandClient } from '@/lib/infrastructure/clients/algorand-client';
import { AlgorandConnector } from '@/lib/services/coordination/connectors/algorand-connector';
import { logger } from '../../utils/logger';

export interface PaymentIntent {
  scorecardId: string;
  amount: number;
  userId: string;
  txId?: string;
}

export class PaymentService {
  private algorandConnector: AlgorandConnector;

  constructor() {
    this.algorandConnector = new AlgorandConnector();
  }

  /**
   * Procesa la publicación de un scorecard tras verificar el micro-pago x402.
   * Grado Aeroespacial: Registro inmutable del pago antes de la activación.
   */
  async processPublicationFee(intent: PaymentIntent): Promise<{ success: boolean; message: string }> {
    if (!intent.txId) {
      return { success: false, message: 'Transaction ID required' };
    }

    logger.info(`📡 Verifying x402 fee for scorecard: ${intent.scorecardId}`);
    
    const isValid = await this.algorandConnector.verifyX402Payment(intent.txId, intent.scorecardId);
    
    if (!isValid) {
      return { success: false, message: 'Invalid or missing x402 payment in Algorand' };
    }

    // TODO: Registrar en Supabase/MongoDB el éxito del pago
    logger.info(`✅ x402 Payment verified for scorecard ${intent.scorecardId}. Proceeding with publication.`);
    
    return { success: true, message: 'Payment verified and publication approved' };
  }

  /**
   * Distribuye recompensas a validadores.
   * Automatización para CU-02.
   * Grado Aeroespacial: Pago real desde la cuenta de recompensas.
   */
  async distributeValidationRewards(validatorAddress: string, amount: number): Promise<string> {
    try {
      logger.info(`💰 Distributing ${amount} microAlgos to validator: ${validatorAddress} from rewards account`);
      
      const result = await algorandClient.sendPayment(
        validatorAddress,
        amount,
        `Andromeda Core Reward: Validator Validation`
      );

      if (!result?.txId) {
        throw new Error('Transaction failed: No txId returned');
      }

      logger.info(`✅ Reward distributed. TX ID: ${result.txId}`);
      return result.txId;
    } catch (error) {
      logger.error(`❌ Failed to distribute reward to ${validatorAddress}:`, error);
      throw error;
    }
  }

  /**
   * Procesa micropagos de agentes autónomos (CU-04/Fase 2).
   */
  async processAgentMicropayment(agentId: string, txId: string, expectedAmount: number): Promise<boolean> {
    logger.info(`🤖 Verifying agent micropayment for agent: ${agentId}`);
    
    // Verificamos el pago usando el receptor de la Tesorería (inbound)
    const treasuryAddr = process.env.NEXT_PUBLIC_TREASURY_ADDRESS;
    if (!treasuryAddr) {
      logger.error('❌ NEXT_PUBLIC_TREASURY_ADDRESS not configured');
      return false;
    }

    const isValid = await algorandClient.verifyPayment(txId, treasuryAddr, expectedAmount);
    
    if (isValid) {
      logger.info(`✅ Agent ${agentId} micropayment verified. TX: ${txId}`);
      return true;
    }

    logger.warn(`⚠️ Invalid agent micropayment for ${agentId}. TX: ${txId}`);
    return false;
  }
}

export const paymentService = new PaymentService();

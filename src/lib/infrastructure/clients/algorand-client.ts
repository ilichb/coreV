import algosdk from 'algosdk';
import { logger } from '../../utils/logger';

export interface AlgorandTransaction {
  id: string;
  sender: string;
  receiver: string;
  amount: number;
  note?: string;
  timestamp: number;
}

export interface PaymentResult {
  txId: string;
  confirmedRound: number;
  timestamp: Date;
}

export class AlgorandClient {
  private client: algosdk.Algodv2;
  private indexer: algosdk.Indexer;
  private rewardAccount: algosdk.Account | null = null;

  constructor(
    token: string = '',
    server: string = 'https://testnet-api.algonode.cloud',
    port: string = '443',
    indexerServer: string = 'https://testnet-idx.algonode.cloud'
  ) {
    this.client = new algosdk.Algodv2(token, server, port);
    this.indexer = new algosdk.Indexer(token, indexerServer, port);
    this.initRewardAccount();
  }

  private initRewardAccount(): void {
    const mnemonic = process.env.ALGORAND_REWARD_MNEMONIC;
    if (mnemonic) {
      try {
        this.rewardAccount = algosdk.mnemonicToSecretKey(mnemonic);
        const derivedAddr = this.rewardAccount.addr;
        const configAddr = process.env.ALGORAND_REWARD_ADDRESS;
        
        if (configAddr && derivedAddr !== configAddr) {
          logger.warn(`⚠️ Mnemonic mismatch! Derived: ${derivedAddr}, Config: ${configAddr}`);
        } else {
          logger.info(`✅ Reward account verified: ${derivedAddr}`);
        }
      } catch (err) {
        logger.error('Failed to initialize reward account from mnemonic:', err);
      }
    } else {
      logger.warn('⚠️ ALGORAND_REWARD_MNEMONIC not set. Payment sending disabled.');
    }
  }

  async getTransaction(txId: string): Promise<AlgorandTransaction> {
    const txInfo = (await this.client.pendingTransactionInformation(txId).do()) as any;
    const txn = txInfo.txn.txn;
    
    return {
      id: txId,
      sender: algosdk.encodeAddress(txn.snd),
      receiver: algosdk.encodeAddress(txn.rcv),
      amount: txn.amt,
      note: txn.note ? Buffer.from(txn.note).toString() : undefined,
      timestamp: txInfo['confirmed-round'] ? await this.getRoundTimestamp(txInfo['confirmed-round']) : Date.now()
    };
  }

  async verifyPayment(txId: string, receiver: string, minAmount: number): Promise<boolean> {
    try {
      const tx = await this.getTransaction(txId);
      return (
        tx.receiver === receiver &&
        tx.amount >= minAmount
      );
    } catch (error) {
      logger.error('Algorand payment verification failed:', error);
      return false;
    }
  }

  /**
   * Envía un pago desde la cuenta de recompensas (tesorería) a una dirección destino.
   * @param to Dirección destino (Algorand address)
   * @param amount Cantidad en microAlgos (1 ALGO = 1,000,000 microAlgos)
   * @param note Nota opcional (texto)
   * @returns Resultado con txId, round confirmado y timestamp
   */
  async sendPayment(to: string, amount: number, note?: string): Promise<PaymentResult> {
    if (!this.rewardAccount) {
      throw new Error('Reward account not configured. Set ALGORAND_REWARD_MNEMONIC.');
    }

    try {
      const params = await this.client.getTransactionParams().do();
      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: this.rewardAccount.addr,
        to: to,
        amount: amount,
        note: note ? new TextEncoder().encode(note) : undefined,
        suggestedParams: params,
      });

      const signedTxn = txn.signTxn(this.rewardAccount.sk);
      const { txId } = await this.client.sendRawTransaction(signedTxn).do();

      logger.info(`💸 Payment sent: ${amount} microAlgos to ${to} (txId: ${txId})`);

      // Esperar confirmación (máximo 30 segundos)
      const confirmed = await this.waitForConfirmation(txId);
      return {
        txId,
        confirmedRound: confirmed['confirmed-round'],
        timestamp: new Date(confirmed['timestamp'] * 1000)
      };
    } catch (error: any) {
      logger.error('Error sending payment:', error);
      throw new Error(`Payment failed: ${error.message}`);
    }
  }

  /**
   * Obtiene el saldo de una cuenta (en microAlgos).
   */
  async getBalance(address: string): Promise<number> {
    try {
      const accountInfo = await this.client.accountInformation(address).do();
      return accountInfo.amount;
    } catch (error: any) {
      logger.error('Error fetching balance:', error);
      throw new Error(`Balance fetch failed: ${error.message}`);
    }
  }

  /**
   * Espera la confirmación de una transacción.
   * @param txId ID de la transacción
   * @param timeoutSegundos Tiempo máximo de espera
   * @returns Información de la transacción confirmada
   */
  private async waitForConfirmation(txId: string, timeoutSegundos: number = 30): Promise<any> {
    const start = Date.now();
    let waitTime = 1000;
    while (Date.now() - start < timeoutSegundos * 1000) {
      const pendingInfo = await this.client.pendingTransactionInformation(txId).do();
      if (pendingInfo['confirmed-round']) {
        return pendingInfo;
      }
      await new Promise(resolve => setTimeout(resolve, waitTime));
      waitTime = Math.min(waitTime * 2, 10000);
    }
    throw new Error(`Transaction ${txId} not confirmed after ${timeoutSegundos} seconds`);
  }

  private async getRoundTimestamp(round: number): Promise<number> {
    const roundInfo = (await this.client.block(round).do()) as any;
    return (roundInfo.block?.ts || roundInfo.timestamp || Math.floor(Date.now() / 1000)) * 1000;
  }

  getRewardAddress(): string | null {
    return this.rewardAccount?.addr || null;
  }
}

export const algorandClient = new AlgorandClient();

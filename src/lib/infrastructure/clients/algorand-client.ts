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

export class AlgorandClient {
  private client: algosdk.Algodv2;
  private indexer: algosdk.Indexer;

  constructor(
    token: string = '',
    server: string = 'https://testnet-api.algonode.cloud',
    port: string = '443',
    indexerServer: string = 'https://testnet-idx.algonode.cloud'
  ) {
    this.client = new algosdk.Algodv2(token, server, port);
    this.indexer = new algosdk.Indexer(token, indexerServer, port);
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

  private async getRoundTimestamp(round: number): Promise<number> {
    const roundInfo = (await this.client.block(round).do()) as any;
    // En algosdk v2, el timestamp suele estar en roundInfo.block.ts o roundInfo.timestamp
    return (roundInfo.block?.ts || roundInfo.timestamp || Math.floor(Date.now() / 1000)) * 1000;
  }
}

export const algorandClient = new AlgorandClient();

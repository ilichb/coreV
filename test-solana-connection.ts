import { solanaClient } from './src/lib/clients/solana-client';

async function test() {
  console.log('SOLANA_RPC_URL from env:', process.env.SOLANA_RPC_URL);
  const status = await solanaClient.getStatus();
  console.log('Status:', status);
}
test().catch(console.error);

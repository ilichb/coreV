import 'dotenv/config';
import { algorandClient } from './src/lib/infrastructure/clients/algorand-client';

async function main() {
  try {
    const to = 'XBLSGRSG7JVK7JNBA55RW55RSTG2OG6RWYL66ALR4H7IP6IHJH6UNR26NQ';
    const amount = 1000; // 0.001 ALGO
    const result = await algorandClient.sendPayment(to, amount, 'Test reward');
    console.log('✅ Payment sent:', result);
    const balance = await algorandClient.getBalance(to);
    console.log(`💰 Balance of treasury: ${balance / 1_000_000} ALGO`);
  } catch (err: any) {
    console.error('❌ Error:', err.message);
  }
}
main();

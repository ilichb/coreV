import { Connection } from '@solana/web3.js';

const wsUrl = process.env.SOLANA_WS_URL;
console.log('WS URL:', wsUrl);
const connection = new Connection(wsUrl, 'confirmed');
const memoProgram = 'MemoSq4gqABZAn9asGmeqb91N9kk973vCdz9G9n3pXr';
const subscriptionId = connection.onLogs(
  memoProgram,
  (logs, context) => {
    console.log('Logs:', logs);
  },
  'finalized'
);
console.log('Subscription ID:', subscriptionId);
setTimeout(() => {
  connection.removeOnLogsListener(subscriptionId);
  console.log('Test finished');
  process.exit(0);
}, 10000);

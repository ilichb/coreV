import { createSolanaRpcSubscriptions } from '@solana/rpc-subscriptions';
import { createSolanaRpc } from '@solana/rpc';

const GRPC_ENDPOINT = process.env.SOLANA_GRPC_ENDPOINT;
const API_KEY = process.env.SOLANA_GRPC_API_KEY;

console.log('Endpoint:', GRPC_ENDPOINT);
console.log('API Key length:', API_KEY?.length);

// Construir URL para Yellowstone gRPC (usando https con protocolo gRPC-web)
const url = `https://${GRPC_ENDPOINT}`;
const wsUrl = `wss://${GRPC_ENDPOINT}`;

console.log('Attempting to connect via HTTP/2 gRPC at:', url);

try {
  // Intentar con la RPC normal (no suscripciones) para verificar autenticación
  const rpc = createSolanaRpc(url);
  const slot = await rpc.getSlot().send();
  console.log('✅ RPC getSlot successful:', slot);
  
  // Probar suscripciones (si funciona)
  const rpcSub = createSolanaRpcSubscriptions(wsUrl);
  const memoProgram = 'MemoSq4gqABZAn9asGmeqb91N9kk973vCdz9G9n3pXr';
  const sub = await rpcSub.logsSubscribe(memoProgram, { kind: 'all' });
  console.log('✅ Subscription created, id:', sub);
  
  setTimeout(async () => {
    await sub;
    console.log('Test completed');
    process.exit(0);
  }, 5000);
} catch (err) {
  console.error('❌ gRPC connection failed:', err);
  process.exit(1);
}

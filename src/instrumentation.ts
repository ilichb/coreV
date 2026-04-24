/**
 * Next.js Instrumentation Hook
 * Se ejecuta una vez al arrancar el servidor.
 * Inicia el conector Yellowstone automáticamente.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { solanaIngestionService } = await import(
      './lib/services/coordination/solana-ingestion.service'
    );
    try {
      await solanaIngestionService.start();
    } catch (err: any) {
      console.error('❌ Yellowstone auto-start failed:', err.message);
    }
  }
}

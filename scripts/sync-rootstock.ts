
import { ecosystemIngestionService } from '../src/lib/services/coordination/connectors/ecosystem-ingestion.service';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env.local' });

async function runSync() {
    console.log('🚀 Starting Rootstock synchronization...');
    try {
        const result = await ecosystemIngestionService.syncEcosystem('rootstock');
        console.log('✅ Sync result:', result);
    } catch (error) {
        console.error('❌ Sync failed:', error);
    }
}

runSync().catch(console.error);

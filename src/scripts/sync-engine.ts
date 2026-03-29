import * as dotenv from 'dotenv';
import path from 'path';
import { logger } from '../lib/utils/logger';

// Load ecosystem variables specifically from the core directory
const envPath = path.join(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

async function directSync() {
    logger.info('🚀 Starting Direct Andromeda Sync Engine (Core)...');
    logger.info(`📄 Using env file at: ${envPath}`);
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
        logger.info('📦 Importing Ecosystem Ingestion Service...');
        // REGLA DE ORO: Alias interno del Core
        const { ecosystemIngestionService } = await import('@/lib/services/coordination/connectors/ecosystem-ingestion.service');

        logger.info('🔄 Triggering syncAll()...');
        const results = await ecosystemIngestionService.syncAll();

        logger.info('\n📊 Sync Results:');
        results.forEach((res: any) => {
            logger.info(`- ${res.ecosystem}: ${res.success ? '✅ SUCCESS' : '❌ FAILED'}`);
            if (res.decisions) logger.info(`  Decisions: ${res.decisions}`);
            if (res.registered) logger.info(`  Registered: ${res.registered}`);
            if (res.error) logger.info(`  Error: ${res.error}`);
        });

        logger.info('\n✨ Direct sync engine completed.');
        process.exit(0);

    } catch (error: any) {
        logger.error('\n❌ Sync Engine failed:', error);
        process.exit(1);
    }
}

directSync();

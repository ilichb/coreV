import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno desde el directorio raíz del proyecto
const envPath = path.join(__dirname, '..', '.env');
console.log(`📁 Cargando variables de entorno desde: ${envPath}`);
dotenv.config({ path: envPath });

// Verificar variables críticas
console.log('🔍 Verificando variables de entorno:');
console.log('- MONGODB_URI:', process.env.MONGODB_URI ? '✅ Presente' : '❌ Ausente');
console.log('- TALLY_API_KEY:', process.env.TALLY_API_KEY ? '✅ Presente' : '❌ Ausente');
console.log('- PINATA_JWT:', process.env.PINATA_JWT ? '✅ Presente' : '❌ Ausente');

import { ecosystemIngestionService } from '../src/lib/services/coordination/connectors/ecosystem-ingestion.service.js';

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

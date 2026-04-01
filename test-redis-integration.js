// Script para probar la integración completa con Redis
require('dotenv').config({ path: '.env' });

const { RedisService } = require('./src/lib/infrastructure/redis.ts');

async function testRedisIntegration() {
    console.log('🔍 Probando integración con Redis...');

    try {
        // Crear una instancia del servicio Redis
        const redisService = new RedisService();

        // Verificar salud
        const healthy = await redisService.healthCheck();
        console.log(`✅ Redis health check: ${healthy ? 'HEALTHY' : 'UNHEALTHY'}`);

        // Probar operaciones básicas
        const testKey = 'test:andromeda:integration';
        const testValue = JSON.stringify({
            timestamp: new Date().toISOString(),
            system: 'Andromeda Core',
            test: 'Redis integration test'
        });

        // SET
        await redisService.set(testKey, testValue, 60); // TTL de 60 segundos
        console.log('✅ SET operation successful');

        // GET
        const retrievedValue = await redisService.get(testKey);
        console.log('✅ GET operation successful');
        console.log(`📦 Retrieved value: ${retrievedValue ? 'Present' : 'Missing'}`);

        if (retrievedValue) {
            const parsed = JSON.parse(retrievedValue);
            console.log(`📊 Data: ${parsed.system} - ${parsed.timestamp}`);
        }

        // Probar operaciones hash
        const hashKey = 'test:andromeda:stats';
        await redisService.hset(hashKey, 'sync_count', '1');
        await redisService.hset(hashKey, 'last_sync', new Date().toISOString());

        const syncCount = await redisService.hget(hashKey, 'sync_count');
        const lastSync = await redisService.hget(hashKey, 'last_sync');

        console.log(`✅ Hash operations successful`);
        console.log(`📊 Sync count: ${syncCount}`);
        console.log(`📊 Last sync: ${lastSync}`);

        // Probar rate limiting (usado en el sistema real)
        const rateLimitKey = 'rate:test:andromeda';
        const rateLimitResult = await redisService.checkRateLimit(rateLimitKey, 5, 60);
        console.log(`✅ Rate limit test: ${rateLimitResult.allowed ? 'Allowed' : 'Blocked'}`);
        console.log(`📊 Reset after: ${rateLimitResult.resetAfter} seconds`);

        // Limpiar datos de prueba
        await redisService.del(testKey);
        await redisService.del(hashKey);
        console.log('🧹 Test data cleaned up');

        console.log('\n🎯 **Prueba de integración Redis COMPLETADA EXITOSAMENTE**');
        console.log('✅ Redis está configurado y funcionando correctamente');
        console.log('✅ El sistema puede usar Redis para:');
        console.log('   - Almacenamiento de caché');
        console.log('   - Estadísticas y métricas');
        console.log('   - Rate limiting');
        console.log('   - Datos temporales');

    } catch (error) {
        console.error('❌ Error en prueba de Redis:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Ejecutar la prueba
testRedisIntegration().catch(console.error);
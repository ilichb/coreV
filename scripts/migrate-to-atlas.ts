#!/usr/bin/env tsx

/**
 * Script de migración para integrar datos existentes con ATLAS
 * 
 * Este script:
 * 1. Conecta a MongoDB Atlas
 * 2. Obtiene decisiones de gobernanza existentes
 * 3. Las ingesta en ATLAS (MongoDB)
 * 4. Genera reporte de migración
 */

import { mongoDBClient } from '@/lib/infrastructure/mongodb';
import { atlasIngestionService } from '@/lib/services/atlas/atlas-ingestion.service';
import { supabase } from '@/lib/services/coordination/supabase';
import { walletHashService } from '@/lib/services/security/wallet-hash.service';

interface MigrationResult {
    totalDecisions: number;
    migrated: number;
    failed: number;
    errors: string[];
    startTime: Date;
    endTime?: Date;
    duration?: number;
}

/**
 * Obtiene decisiones de gobernanza existentes de Supabase
 */
async function getExistingDecisions(): Promise<any[]> {
    console.log('🔍 Buscando decisiones existentes en Supabase...');

    try {
        const { data, error } = await supabase
            .from('scorecards')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1000); // Limitar para migración inicial

        if (error) {
            console.error('❌ Error obteniendo decisiones de Supabase:', error);
            return [];
        }

        console.log(`✅ Se encontraron ${data?.length || 0} decisiones en Supabase`);
        return data || [];
    } catch (error) {
        console.error('❌ Error crítico obteniendo decisiones:', error);
        return [];
    }
}

/**
 * Transforma datos de Supabase a formato StandardGovernanceDecision
 */
function transformToStandardDecision(supabaseData: any): any {
    return {
        proposal_id: supabaseData.proposal_id || `supabase-${supabaseData.id}`,
        dao_identifier: supabaseData.dao_identifier || 'unknown',
        ecosystem: supabaseData.ecosystem || 'unknown',
        title: supabaseData.title || '',
        description: supabaseData.description || '',
        discussion_url: supabaseData.discussion_url || '',
        snapshot_url: supabaseData.snapshot_url || '',
        proposal_type: 'STANDARD',
        voting_system: 'SIMPLE_MAJORITY',
        start_timestamp: supabaseData.start_timestamp || Date.now() / 1000,
        end_timestamp: supabaseData.end_timestamp || Date.now() / 1000,
        status: supabaseData.status || 'PASSED',
        votes_for: Number(supabaseData.votes_for || 0),
        votes_against: Number(supabaseData.votes_against || 0),
        voting_power_total: Number(supabaseData.voting_power_total || 0),
        quorum_required: Number(supabaseData.quorum_required || 0),
        created_at: supabaseData.created_at || Math.floor(Date.now() / 1000),
        updated_at: supabaseData.updated_at || Math.floor(Date.now() / 1000),
        ipfs_cid: supabaseData.ipfs_cid,
        builder_did: supabaseData.builder_did,
        tags: supabaseData.tags || []
    };
}

/**
 * Ejecuta la migración completa
 */
async function runMigration(): Promise<MigrationResult> {
    const result: MigrationResult = {
        totalDecisions: 0,
        migrated: 0,
        failed: 0,
        errors: [],
        startTime: new Date()
    };

    try {
        console.log('🚀 Iniciando migración a ATLAS...');
        console.log('='.repeat(50));

        // 1. Verificar conexión a MongoDB
        console.log('🔌 Verificando conexión a MongoDB Atlas...');
        const mongoHealth = await mongoDBClient.healthCheck();

        if (!mongoHealth.connected) {
            throw new Error(`MongoDB no está conectado: ${mongoHealth.error}`);
        }

        console.log(`✅ MongoDB conectado (latencia: ${mongoHealth.latency}ms)`);

        // 2. Obtener decisiones existentes
        const existingDecisions = await getExistingDecisions();
        result.totalDecisions = existingDecisions.length;

        if (result.totalDecisions === 0) {
            console.log('ℹ️ No hay decisiones para migrar');
            return result;
        }

        console.log(`📊 Migrando ${result.totalDecisions} decisiones a ATLAS...`);

        // 3. Procesar cada decisión
        for (let i = 0; i < existingDecisions.length; i++) {
            const decisionData = existingDecisions[i];

            if (i % 10 === 0) {
                console.log(`  - Procesando ${i + 1}/${result.totalDecisions}...`);
            }

            try {
                // Transformar a formato estándar
                const standardDecision = transformToStandardDecision(decisionData);

                // Ingestar en ATLAS
                const ingestionResult = await atlasIngestionService.ingestToAtlas(standardDecision);

                if (ingestionResult.success) {
                    result.migrated++;
                    console.log(`    ✅ ${decisionData.proposal_id || decisionData.id}: migrado (ID: ${ingestionResult.atlasId})`);
                } else {
                    result.failed++;
                    result.errors.push(`Decision ${decisionData.proposal_id || decisionData.id}: ${ingestionResult.error}`);
                    console.log(`    ❌ ${decisionData.proposal_id || decisionData.id}: falló - ${ingestionResult.error}`);
                }
            } catch (error: any) {
                result.failed++;
                result.errors.push(`Decision ${decisionData.proposal_id || decisionData.id}: ${error.message}`);
                console.log(`    ❌ ${decisionData.proposal_id || decisionData.id}: error crítico - ${error.message}`);
            }
        }

        // 4. Finalizar migración
        result.endTime = new Date();
        result.duration = result.endTime.getTime() - result.startTime.getTime();

        console.log('='.repeat(50));
        console.log('🏁 Migración completada');
        console.log(`📈 Resumen:`);
        console.log(`   Total decisiones: ${result.totalDecisions}`);
        console.log(`   Migradas exitosamente: ${result.migrated}`);
        console.log(`   Fallidas: ${result.failed}`);
        console.log(`   Duración: ${result.duration}ms`);
        console.log(`   Tasa de éxito: ${((result.migrated / result.totalDecisions) * 100).toFixed(2)}%`);

        if (result.errors.length > 0) {
            console.log(`\n⚠️ Errores encontrados (${result.errors.length}):`);
            result.errors.slice(0, 5).forEach((error, index) => {
                console.log(`   ${index + 1}. ${error}`);
            });
            if (result.errors.length > 5) {
                console.log(`   ... y ${result.errors.length - 5} errores más`);
            }
        }

        // 5. Verificar estado final
        console.log('\n🔍 Verificando estado de ATLAS después de migración...');
        const atlasHealth = await atlasIngestionService.healthCheck();

        console.log(`   Estado del servicio: ${atlasHealth.service}`);
        console.log(`   MongoDB: ${atlasHealth.mongoDB}`);

        if (atlasHealth.stats) {
            console.log(`   Total milestones en ATLAS: ${atlasHealth.stats.totalMilestones}`);
            console.log(`   Distribución por ecosistema:`);
            Object.entries(atlasHealth.stats.byEcosystem).forEach(([ecosystem, count]) => {
                console.log(`     - ${ecosystem}: ${count}`);
            });
        }

        return result;

    } catch (error: any) {
        console.error('❌ Error crítico en migración:', error);
        result.endTime = new Date();
        result.duration = result.endTime.getTime() - result.startTime.getTime();
        result.errors.push(`Error crítico: ${error.message}`);

        return result;
    }
}

/**
 * Función principal
 */
async function main() {
    console.log('🔧 Script de migración ATLAS v1.0');
    console.log('='.repeat(50));

    try {
        const result = await runMigration();

        // Guardar reporte de migración
        const report = {
            migration: result,
            timestamp: new Date().toISOString()
        };

        console.log('\n📄 Reporte de migración guardado:', JSON.stringify(report, null, 2));

        return result;
    } catch (error: any) {
        console.error('❌ Error en función principal:', error);
        process.exit(1);
    }
}

// Ejecutar script
main().catch(error => {
    console.error('❌ Error no manejado:', error);
    process.exit(1);
});

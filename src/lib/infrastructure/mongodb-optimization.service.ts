import { Collection, Db } from 'mongodb';
import { mongoDBClient } from './mongodb';
import { logger } from '../utils/logger';

/**
 * Servicio de optimización de índices para MongoDB Atlas
 * Implementa los índices compuestos requeridos por la Fase 2.2 de ATLAS
 */
export class MongoDBOptimizationService {
  private static instance: MongoDBOptimizationService;
  private isInitialized = false;

  private constructor() { }

  public static getInstance(): MongoDBOptimizationService {
    if (!MongoDBOptimizationService.instance) {
      MongoDBOptimizationService.instance = new MongoDBOptimizationService();
    }
    return MongoDBOptimizationService.instance;
  }

  /**
   * Inicializa todos los índices compuestos para optimización de búsquedas
   * Según especificación Fase 2.2
   */
  public async initializeOptimizationIndexes(): Promise<void> {
    if (this.isInitialized) {
      logger.info('✅ MongoDB optimization indexes already initialized');
      return;
    }

    try {
      logger.info('🔄 Initializing MongoDB optimization indexes...');

      await mongoDBClient.connect();
      const collection = mongoDBClient.getMilestonesCollection();

      // Índices compuestos según especificación Fase 2.2
      await this.createCompositeIndexes(collection);

      this.isInitialized = true;
      logger.info('✅ MongoDB optimization indexes initialized successfully');
    } catch (error: any) {
      logger.error('❌ Failed to initialize MongoDB optimization indexes:', error.message);
      throw error;
    }
  }

  /**
   * Crea los índices compuestos para consultas rápidas
   */
  private async createCompositeIndexes(collection: Collection): Promise<void> {
    logger.info('📊 Creating composite indexes for ATLAS search optimization...');

    // 1. idx_wallet_impact: Para mostrar el "top hitos" de un builder rápidamente
    // { "action.metadata.builderDid": 1, "metadata.trustScore": -1 }
    await collection.createIndex(
      {
        'action.metadata.builderDid': 1,
        'metadata.trustScore': -1
      },
      {
        name: 'idx_wallet_impact',
        background: true,
        partialFilterExpression: { 'action.metadata.builderDid': { $exists: true } }
      }
    );

    // 2. idx_category_impact: Para rankings por sector (ej: mejores proyectos DeFi)
    // { "action.tags": 1, "metadata.trustScore": -1 }
    await collection.createIndex(
      {
        'action.tags': 1,
        'metadata.trustScore': -1
      },
      {
        name: 'idx_category_impact',
        background: true,
        partialFilterExpression: { 'action.tags': { $exists: true, $ne: [] } }
      }
    );

    // 3. idx_ecosystem_impact: Para filtrar por cadena/ecosistema
    // { "sourceScorecard.metadata.ecosystem": 1, "metadata.trustScore": -1 }
    await collection.createIndex(
      {
        'sourceScorecard.metadata.ecosystem': 1,
        'metadata.trustScore': -1
      },
      {
        name: 'idx_ecosystem_impact',
        background: true,
        sparse: true // Sparse porque no todos los milestones tienen sourceScorecard
      }
    );

    // 4. idx_wallet_timeline: Para la línea de tiempo de un builder
    // { "action.metadata.builderDid": 1, "metadata.createdAt": -1 }
    await collection.createIndex(
      {
        'action.metadata.builderDid': 1,
        'metadata.createdAt': -1
      },
      {
        name: 'idx_wallet_timeline',
        background: true,
        partialFilterExpression: {
          'action.metadata.builderDid': { $exists: true },
          'metadata.createdAt': { $exists: true }
        }
      }
    );

    // 5. Índice adicional: Para búsqueda por estado y fecha (ya existe pero lo mantenemos)
    await collection.createIndex(
      {
        'status': 1,
        'metadata.createdAt': -1
      },
      {
        name: 'idx_status_timeline',
        background: true
      }
    );

    // 6. Índice adicional: Para búsqueda por tipo de acción
    await collection.createIndex(
      {
        'action.type': 1,
        'metadata.createdAt': -1
      },
      {
        name: 'idx_action_type_timeline',
        background: true
      }
    );

    // 7. Índice de texto para búsqueda full-text en descripción y tags
    await collection.createIndex(
      {
        'action.description': 'text',
        'action.tags': 'text'
      },
      {
        name: 'idx_fulltext_search',
        background: true,
        weights: {
          'action.description': 3,  // Peso mayor para descripción
          'action.tags': 2           // Peso menor para tags
        },
        default_language: 'spanish'
      }
    );

    logger.info(`✅ Created 7 optimization indexes for ATLAS search`);
  }

  /**
   * Obtiene estadísticas de los índices
   */
  public async getIndexStats(): Promise<any> {
    try {
      await mongoDBClient.connect();
      const collection = mongoDBClient.getMilestonesCollection();

      const stats = await mongoDBClient.getDb().command({ collStats: collection.collectionName });
      const indexes = await collection.listIndexes().toArray();

      return {
        collection: stats.ns,
        count: stats.count,
        size: stats.size,
        storageSize: stats.storageSize,
        totalIndexSize: stats.totalIndexSize,
        indexes: indexes.map((idx: any) => ({
          name: idx.name,
          key: idx.key,
          size: idx.size,
          usage: idx.usage
        }))
      };
    } catch (error: any) {
      logger.error('Error getting index stats:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Ejecuta explain() en una consulta para verificar uso de índices
   */
  public async explainQuery(query: any, sort?: any, limit: number = 10): Promise<any> {
    try {
      await mongoDBClient.connect();
      const collection = mongoDBClient.getMilestonesCollection();

      const cursor = collection.find(query);

      if (sort) {
        cursor.sort(sort);
      }

      if (limit) {
        cursor.limit(limit);
      }

      const explain = await cursor.explain('executionStats');

      return {
        query,
        sort,
        limit,
        executionStats: explain.executionStats,
        winningPlan: explain.queryPlanner.winningPlan,
        rejectedPlans: explain.queryPlanner.rejectedPlans,
        indexUsed: explain.queryPlanner.winningPlan.inputStage?.stage === 'IXSCAN'
          ? explain.queryPlanner.winningPlan.inputStage.indexName
          : null
      };
    } catch (error: any) {
      logger.error('Error explaining query:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Consultas de ejemplo para probar los índices
   */
  public async runBenchmarkQueries(): Promise<any[]> {
    const benchmarks: { name: string; expectedIndex: string; result: any }[] = [];

    // Query 1: Top hitos de un builder específico
    logger.info('🔍 Running benchmark: Top milestones by builder...');
    const query1 = { 'action.metadata.builderDid': { $exists: true } };
    const sort1 = { 'metadata.trustScore': -1 };
    const explain1 = await this.explainQuery(query1, sort1, 10);
    benchmarks.push({
      name: 'Top milestones by builder (wallet + impact)',
      expectedIndex: 'idx_wallet_impact',
      result: explain1
    });

    // Query 2: Rankings por categoría (ej: DeFi)
    logger.info('🔍 Running benchmark: Rankings by category...');
    const query2 = { 'action.tags': 'defi' };
    const sort2 = { 'metadata.trustScore': -1 };
    const explain2 = await this.explainQuery(query2, sort2, 20);
    benchmarks.push({
      name: 'Rankings by category (category + impact)',
      expectedIndex: 'idx_category_impact',
      result: explain2
    });

    // Query 3: Timeline de un builder
    logger.info('🔍 Running benchmark: Builder timeline...');
    const query3 = {
      'action.metadata.builderDid': 'did:andromeda:eth:0x123...',
      'metadata.createdAt': { $exists: true }
    };
    const sort3 = { 'metadata.createdAt': -1 };
    const explain3 = await this.explainQuery(query3, sort3, 50);
    benchmarks.push({
      name: 'Builder timeline (wallet + timestamp)',
      expectedIndex: 'idx_wallet_timeline',
      result: explain3
    });

    // Query 4: Búsqueda full-text
    logger.info('🔍 Running benchmark: Full-text search...');
    const query4 = { $text: { $search: 'governance protocol upgrade' } };
    const explain4 = await this.explainQuery(query4, undefined, 10);
    benchmarks.push({
      name: 'Full-text search',
      expectedIndex: 'idx_fulltext_search',
      result: explain4
    });

    return benchmarks;
  }

  /**
   * Verifica que todos los índices requeridos estén presentes
   */
  public async verifyRequiredIndexes(): Promise<{
    allPresent: boolean;
    missing: string[];
    present: string[];
  }> {
    const requiredIndexes = [
      'idx_wallet_impact',
      'idx_category_impact',
      'idx_ecosystem_impact',
      'idx_wallet_timeline',
      'idx_status_timeline',
      'idx_action_type_timeline',
      'idx_fulltext_search'
    ];

    try {
      const stats = await this.getIndexStats();
      if (stats.error) {
        return {
          allPresent: false,
          missing: requiredIndexes,
          present: []
        };
      }

      const presentIndexes = stats.indexes.map((idx: any) => idx.name);
      const missingIndexes = requiredIndexes.filter(idx => !presentIndexes.includes(idx));

      return {
        allPresent: missingIndexes.length === 0,
        missing: missingIndexes,
        present: presentIndexes.filter((idx: string) => requiredIndexes.includes(idx))
      };
    } catch (error: any) {
      return {
        allPresent: false,
        missing: requiredIndexes,
        present: []
      };
    }
  }

  /**
   * Genera un reporte de optimización
   */
  public async generateOptimizationReport(): Promise<any> {
    const [indexStats, requiredIndexes, benchmarkResults] = await Promise.all([
      this.getIndexStats(),
      this.verifyRequiredIndexes(),
      this.runBenchmarkQueries().catch(() => [])
    ]);

    // Evaluar rendimiento basado en explain()
    const performanceMetrics = benchmarkResults.map((benchmark: any) => {
      const execStats = benchmark.result?.executionStats;
      const indexUsed = benchmark.result?.indexUsed;

      return {
        query: benchmark.name,
        expectedIndex: benchmark.expectedIndex,
        actualIndex: indexUsed,
        usesExpectedIndex: indexUsed === benchmark.expectedIndex,
        executionTime: execStats?.executionTimeMillis || null,
        documentsExamined: execStats?.totalDocsExamined || null,
        documentsReturned: execStats?.nReturned || null,
        indexKeysExamined: execStats?.totalKeysExamined || null
      };
    });

    return {
      timestamp: new Date().toISOString(),
      optimizationStatus: requiredIndexes.allPresent ? 'OPTIMAL' : 'REQUIRES_OPTIMIZATION',
      indexVerification: requiredIndexes,
      collectionStats: {
        totalDocuments: indexStats.count || 0,
        totalSizeMB: Math.round((indexStats.size || 0) / (1024 * 1024)),
        totalIndexSizeMB: Math.round((indexStats.totalIndexSize || 0) / (1024 * 1024)),
        indexCount: indexStats.indexes?.length || 0
      },
      performanceMetrics,
      recommendations: requiredIndexes.missing.length > 0 ? [
        `Missing indexes: ${requiredIndexes.missing.join(', ')}`,
        'Run initializeOptimizationIndexes() to create missing indexes'
      ] : [
        'All required indexes present',
        'Consider running benchmark queries to verify performance'
      ]
    };
  }
}

// Exportar instancia Singleton
export const mongoDBOptimizationService = MongoDBOptimizationService.getInstance();
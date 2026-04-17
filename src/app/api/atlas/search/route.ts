import { NextRequest, NextResponse } from 'next/server';
import { mongoDBClient } from '@/lib/infrastructure/mongodb';
import { mongoDBOptimizationService } from '@/lib/infrastructure/mongodb-optimization.service';
import { IndustryValidator } from '@/lib/industries/validator';
import { walletHashService } from '@/lib/services/security/wallet-hash.service';
import { supabase } from '@/lib/services/coordination/supabase';
import { logger } from '../../../../lib/utils/logger';

/**
 * Endpoint de búsqueda unificada ATLAS (Fase 2.3) con soporte para Índice Maestro de Industrias
 * 
 * Query parameters:
 * - builderDid: DID del builder (ej: did:andromeda:eth:0x...)
 * - category: Categoría de impacto (defi, governance, infrastructure, etc.)
 * - ecosystem: Ecosistema (rootstock, snapshot, ethereum, etc.)
 * - minImpact: Puntuación mínima de impacto (0-100)
 * - maxImpact: Puntuación máxima de impacto (0-100)
 * - status: Estado del milestone (PENDING, VERIFIED, IMMUTABLE, etc.)
 * - actionType: Tipo de acción (CODE_CONTRIBUTION, PROTOCOL_DESIGN, etc.)
 * - search: Texto para búsqueda full-text
 * - sortBy: Campo para ordenar (impact, createdAt, updatedAt)
 * - sortOrder: Dirección (asc, desc)
 * - limit: Límite de resultados (default: 20)
 * - offset: Offset para paginación (default: 0)
 * 
 * Parámetros de taxonomía (Índice Maestro):
 * - industryId: ID de industria principal (ej: finance, infrastructure)
 * - subIndustryId: ID de subindustria (ej: finance.web3.dex, media.trad.film)
 * - isWeb3: true/false - Filtrar por tipo Web3 o Tradicional
 * - transversalLayer: Capa transversal (identity, privacy)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parsear parámetros de búsqueda
    const builderDid = searchParams.get('builderDid')?.trim();
    const category = searchParams.get('category');
    const ecosystem = searchParams.get('ecosystem');
    const minImpact = searchParams.get('minImpact');
    const maxImpact = searchParams.get('maxImpact');
    const status = searchParams.get('status');
    const actionType = searchParams.get('actionType');
    const searchText = searchParams.get('search')?.trim();
    const sortBy = searchParams.get('sortBy') || 'metadata.trustScore';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Parsear parámetros de taxonomía (Índice Maestro)
    const industryId = searchParams.get('industryId');
    const subIndustryId = searchParams.get('subIndustryId');
    const isWeb3 = searchParams.get('isWeb3');
    const transversalLayer = searchParams.get('transversalLayer');

    // Construir query MongoDB
    const query: any = {};

    if (builderDid) {
      // Verificar preferencias de privacidad del builder
      const privacyStatus = await checkBuilderPrivacyStatus(builderDid);
      
      if (privacyStatus.isHidden || privacyStatus.optOut) {
        // Builder ha ejercido derecho al olvido u opt-out
        // No retornar resultados o retornar versión hasheada según política
        return NextResponse.json({
          success: true,
          query: { builderDid },
          results: [],
          stats: { totalResults: 0 },
          pagination: {
            total: 0,
            limit,
            offset,
            hasMore: false,
            nextOffset: null
          },
          privacy: {
            status: 'RESTRICTED',
            reason: privacyStatus.isHidden ? 'RIGHT_TO_BE_FORGOTTEN' : 'OPT_OUT',
            note: 'Builder ha ejercido derechos de privacidad'
          }
        });
      }
      
      const isAddress = /^0x[a-fA-F0-9]{40}$/i.test(builderDid);
      if (isAddress) {
        const addr = builderDid.toLowerCase();
        query['action.metadata.builderDid'] = { $in: [
          addr,
          `did:andromeda:rootstock:${addr}`,
          `did:andromeda:eth:${addr}`,
          `did:andromeda:optimism:${addr}`,
          `did:andromeda:arbitrum:${addr}`
        ]};
      } else {
        query['action.metadata.builderDid'] = builderDid;
      }
    }

    if (category) {
      query['action.tags'] = category;
    }

    if (ecosystem) {
      query['sourceScorecard.ecosystem'] = ecosystem;
    }

    if (minImpact || maxImpact) {
      query['metadata.trustScore'] = {};
      if (minImpact) {
        query['metadata.trustScore'].$gte = parseInt(minImpact);
      }
      if (maxImpact) {
        query['metadata.trustScore'].$lte = parseInt(maxImpact);
      }
    }

    if (status) {
      query['status'] = status;
    }

    if (actionType) {
      query['action.type'] = actionType;
    }

    if (industryId) {
      query['action.metadata.industryId'] = industryId;
    }

    if (subIndustryId) {
      query['action.metadata.subIndustryId'] = subIndustryId;
    }

    if (isWeb3 !== null && isWeb3 !== undefined) {
      query['action.metadata.isWeb3'] = isWeb3 === 'true';
    }

    if (transversalLayer) {
      query['action.metadata.transversalLayer'] = transversalLayer;
    }

    if (searchText) {
      const isAddress = /^0x[a-fA-F0-9]{40}$/i.test(searchText);
      if (isAddress) {
        const addr = searchText.toLowerCase();
        // Si es una dirección, buscamos coincidencia exacta o por múltiples formatos de DID
        query.$or = [
          { 'action.metadata.builderDid': { $regex: searchText, $options: 'i' } },
          { 'action.metadata.builderDid': `did:andromeda:rootstock:${addr}` },
          { 'action.metadata.builderDid': `did:andromeda:eth:${addr}` },
          { 'action.metadata.builderDid': `did:pkh:eip155:30:${addr}` },
          { 'action.metadata.builderDid': `did:pkh:eip155:1:${addr}` }
        ];
      } else {
        query.$text = { $search: searchText };
      }
    }

    // Construir sort
    const sort: any = {};
    sort[sortBy] = sortOrder;

    // Ejecutar consulta
    await mongoDBClient.connect();
    const collection = mongoDBClient.getMilestonesCollection();

    // Obtener total para paginación
    const total = await collection.countDocuments(query);

    // Ejecutar consulta con paginación
    const cursor = collection
      .find(query)
      .sort(sort)
      .skip(offset)
      .limit(limit);

    const results = await cursor.toArray();

    // Formatear resultados
    const formattedResults = results.map((doc: any) => ({
      atlasId: doc.atlasId,
      status: doc.status,
      name: doc.name || doc.action?.metadata?.name || undefined,
      action: {
        type: doc.action?.type,
        description: doc.action?.description,
        tags: doc.action?.tags || [],
        metadata: doc.action?.metadata || {}
      },
      impactScore: doc.metadata?.trustScore || 0,
      reputationScore: doc.metadata?.avipScore?.total || doc.metadata?.trustScore || 0,
      avipDetails: doc.metadata?.avipScore || null,
      builderDid: doc.action?.metadata?.builderDid,
      ecosystem: doc.sourceScorecard?.ecosystem || doc.action?.metadata?.ecosystem || doc.action?.tags?.[0] || 'unknown',
      createdAt: doc.metadata?.createdAt,
      updatedAt: doc.metadata?.updatedAt,
      evidenceCount: doc.evidence?.length || 0,
      attestationCount: doc.attestations?.length || 0,
      verificationLevel: Math.max(...(doc.attestations?.map((a: any) => a.level) || [0]))
    }));

    // Calcular estadísticas agregadas si hay resultados
    let aggregateStats = {};
    if (results.length > 0) {
      const impactScores = results
        .map((r: any) => r.metadata?.trustScore || 0)
        .filter((score: number) => score > 0);

      if (impactScores.length > 0) {
        aggregateStats = {
          totalResults: total,
          averageImpact: impactScores.reduce((a, b) => a + b, 0) / impactScores.length,
          maxImpact: Math.max(...impactScores),
          minImpact: Math.min(...impactScores),
          resultsCount: results.length
        };
      }
    }

    return NextResponse.json({
      success: true,
      query: {
        filters: {
          builderDid,
          category,
          ecosystem,
          minImpact: minImpact ? parseInt(minImpact) : undefined,
          maxImpact: maxImpact ? parseInt(maxImpact) : undefined,
          status,
          actionType,
          searchText
        },
        pagination: {
          limit,
          offset,
          total
        },
        sort: {
          by: sortBy,
          order: sortOrder === 1 ? 'asc' : 'desc'
        }
      },
      results: formattedResults,
      stats: aggregateStats,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + results.length < total,
        nextOffset: offset + results.length < total ? offset + results.length : null
      }
    });

  } catch (error: any) {
    logger.error('ATLAS Search API error:', error);
    
    // Obtener parámetros del request para usar en respuesta de fallback
    const searchParams = request.nextUrl.searchParams;
    const fallbackLimit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const fallbackOffset = parseInt(searchParams.get('offset') || '0');
    
    // Si es error de conexión a MongoDB, devolver respuesta de modo degradado
    if (error.message?.includes('ENOTFOUND') || error.message?.includes('getaddrinfo') || 
        error.message?.includes('MongoServerSelectionError')) {
      return NextResponse.json({
        success: true,
        query: {},
        results: [], // Array vacío
        stats: {},
        pagination: {
          total: 0,
          limit: fallbackLimit,
          offset: fallbackOffset,
          hasMore: false,
          nextOffset: null
        },
        warning: 'MongoDB no disponible - Modo de prueba activo',
        note: 'Los índices de optimización no están disponibles. Ejecuta: npx tsx scripts/initialize-atlas-indexes.ts'
      }, { status: 200 });
    }
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

/**
 * Verifica el estado de privacidad de un builder
 * Consulta Supabase para ver si ha ejercido derechos de privacidad
 */
async function checkBuilderPrivacyStatus(builderDid: string): Promise<{
  isHidden: boolean;
  optOut: boolean;
  walletHash?: string;
  privacyFlags: string[];
}> {
  try {
    // Consultar builder_profile en Supabase
    const { data: profile, error } = await supabase
      .from('builder_profiles')
      .select('isHidden, optOut, walletHash, hiddenReason, optOutReason')
      .eq('wallet', builderDid.toLowerCase())
      .maybeSingle(); // Retorna null si no existe

    if (error) {
      logger.warn('Error consultando privacidad del builder:', error);
    }

    const isHidden = profile?.isHidden === true;
    const optOut = profile?.optOut === true;
    
    const privacyFlags: string[] = [];
    if (isHidden) privacyFlags.push('HIDDEN');
    if (optOut) privacyFlags.push('OPT_OUT');
    if (profile?.hiddenReason) privacyFlags.push(`REASON:${profile.hiddenReason}`);
    if (profile?.optOutReason) privacyFlags.push(`OPT_OUT_REASON:${profile.optOutReason}`);

    return {
      isHidden,
      optOut,
      walletHash: profile?.walletHash,
      privacyFlags
    };
  } catch (error) {
    logger.error('Error en checkBuilderPrivacyStatus:', error);
    return {
      isHidden: false,
      optOut: false,
      privacyFlags: ['ERROR']
    };
  }
}

/**
 * Hashea un builderDid para usar en estadísticas agregadas
 * Mantiene privacidad mientras permite análisis agregados
 */
function hashBuilderForStats(builderDid: string): string {
  try {
    return walletHashService.hashWallet(builderDid).walletHash;
  } catch {
    // Fallback simple si el servicio falla
    const simpleHash = Buffer.from(builderDid).toString('base64url').substring(0, 16);
    return `hash:${simpleHash}`;
  }
}

/**
 * Sanitiza resultados para proteger privacidad
 * Reemplaza DIDs con hashes en resultados públicos
 */
function sanitizeResultsForPrivacy(results: any[]): any[] {
  return results.map(result => ({
    ...result,
    // Reemplazar builderDid con hash en resultados públicos
    builderDid: hashBuilderForStats(result.builderDid),
    // Preservar información técnica pero remover datos identificables
    action: {
      ...result.action,
      metadata: {
        // Mantener solo campos no identificables
        industry: result.action.metadata?.industry,
        category: result.action.metadata?.category,
        // Remover campos sensibles
        builderName: undefined,
        personalInfo: undefined,
        contactDetails: undefined
      }
    }
  }));
}
/**
 * Endpoint para búsquedas avanzadas (POST con JSON body)
 * Permite queries más complejas que no caben en URL parameters
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      filters = {},
      sort = { by: 'metadata.trustScore', order: 'desc' },
      pagination = { limit: 20, offset: 0 },
      includeStats = true
    } = body;

    // Construir query MongoDB desde filters
    const query: any = {};

    // Filtros básicos
    if (filters.builderDid) {
      const isAddress = /^0x[a-fA-F0-9]{40}$/i.test(filters.builderDid);
      if (isAddress) {
        const addr = filters.builderDid.toLowerCase();
        query['action.metadata.builderDid'] = { $in: [
          addr,
          `did:andromeda:rootstock:${addr}`,
          `did:andromeda:eth:${addr}`,
          `did:andromeda:optimism:${addr}`,
          `did:andromeda:arbitrum:${addr}`
        ]};
      } else {
        query['action.metadata.builderDid'] = filters.builderDid;
      }
    }

    if (filters.categories && filters.categories.length > 0) {
      query['action.tags'] = { $in: filters.categories };
    }

    if (filters.ecosystems && filters.ecosystems.length > 0) {
      query['sourceScorecard.ecosystem'] = { $in: filters.ecosystems };
    }

    if (filters.minImpact !== undefined || filters.maxImpact !== undefined) {
      query['metadata.trustScore'] = {};
      if (filters.minImpact !== undefined) {
        query['metadata.trustScore'].$gte = filters.minImpact;
      }
      if (filters.maxImpact !== undefined) {
        query['metadata.trustScore'].$lte = filters.maxImpact;
      }
    }

    if (filters.statuses && filters.statuses.length > 0) {
      query['status'] = { $in: filters.statuses };
    }

    if (filters.actionTypes && filters.actionTypes.length > 0) {
      query['action.type'] = { $in: filters.actionTypes };
    }

    if (filters.dateRange) {
      query['metadata.createdAt'] = {};
      if (filters.dateRange.start) {
        query['metadata.createdAt'].$gte = filters.dateRange.start;
      }
      if (filters.dateRange.end) {
        query['metadata.createdAt'].$lte = filters.dateRange.end;
      }
    }

    if (filters.industryId) {
      query['action.metadata.industryId'] = filters.industryId;
    }

    if (filters.subIndustryId) {
      query['action.metadata.subIndustryId'] = filters.subIndustryId;
    }

    if (filters.isWeb3 !== undefined) {
      query['action.metadata.isWeb3'] = filters.isWeb3;
    }

    if (filters.transversalLayer) {
      query['action.metadata.transversalLayer'] = filters.transversalLayer;
    }

    if (filters.searchText) {
      const isAddress = /^0x[a-fA-F0-9]{40}$/.test(filters.searchText);
      if (isAddress) {
        query.$or = [
          { 'action.metadata.builderDid': { $regex: filters.searchText, $options: 'i' } },
          { 'action.metadata.builderDid': `did:andromeda:rootstock:${filters.searchText.toLowerCase()}` },
          { 'action.metadata.builderDid': `did:andromeda:eth:${filters.searchText.toLowerCase()}` }
        ];
      } else {
        query.$text = { $search: filters.searchText };
      }
    }

    // Construir sort
    const sortObj: any = {};
    sortObj[sort.by] = sort.order === 'asc' ? 1 : -1;

    // Ejecutar consulta
    await mongoDBClient.connect();
    const collection = mongoDBClient.getMilestonesCollection();

    // Obtener total
    const total = await collection.countDocuments(query);

    // Ejecutar consulta
    const cursor = collection
      .find(query)
      .sort(sortObj)
      .skip(pagination.offset || 0)
      .limit(Math.min(pagination.limit || 20, 100));

    const results = await cursor.toArray();

    // Formatear resultados
    const formattedResults = results.map((doc: any) => ({
      atlasId: doc.atlasId,
      status: doc.status,
      name: doc.name || doc.action?.metadata?.name || undefined,
      action: doc.action,
      impactScore: doc.metadata?.trustScore || 0,
      reputationScore: doc.metadata?.avipScore?.total || doc.metadata?.trustScore || 0,
      avipDetails: doc.metadata?.avipScore || null,
      builderDid: doc.action?.metadata?.builderDid,
      ecosystem: doc.sourceScorecard?.ecosystem || doc.action?.metadata?.ecosystem || doc.action?.tags?.[0] || 'unknown',
      createdAt: doc.metadata?.createdAt,
      updatedAt: doc.metadata?.updatedAt,
      evidence: doc.evidence?.map((e: any) => ({
        type: e.type,
        uri: e.uri,
        hash: e.hash?.substring(0, 16) + '...'
      })),
      attestations: doc.attestations?.map((a: any) => ({
        signerDid: a.signerDid,
        level: a.level,
        timestamp: a.timestamp
      }))
    }));

    // Calcular estadísticas si se solicitan
    let stats = {};
    if (includeStats && results.length > 0) {
      const impactScores = results
        .map((r: any) => r.metadata?.trustScore || 0)
        .filter((score: number) => score > 0);

      if (impactScores.length > 0) {
        stats = {
          averageImpact: impactScores.reduce((a, b) => a + b, 0) / impactScores.length,
          maxImpact: Math.max(...impactScores),
          minImpact: Math.min(...impactScores),
          totalImpact: impactScores.reduce((a, b) => a + b, 0),
          distributionByStatus: results.reduce((acc: any, r: any) => {
            acc[r.status] = (acc[r.status] || 0) + 1;
            return acc;
          }, {}),
          distributionByCategory: results.reduce((acc: any, r: any) => {
            (r.action?.tags || []).forEach((tag: string) => {
              acc[tag] = (acc[tag] || 0) + 1;
            });
            return acc;
          }, {})
        };
      }
    }

    return NextResponse.json({
      success: true,
      query: {
        filters,
        sort,
        pagination: {
          ...pagination,
          total
        }
      },
      results: formattedResults,
      stats: includeStats ? stats : undefined,
      pagination: {
        total,
        limit: pagination.limit || 20,
        offset: pagination.offset || 0,
        hasMore: (pagination.offset || 0) + results.length < total,
        nextOffset: (pagination.offset || 0) + results.length < total 
          ? (pagination.offset || 0) + results.length 
          : null
      }
    });

  } catch (error: any) {
    logger.error('ATLAS Advanced Search API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

/**
 * Health check del endpoint de búsqueda
 * Verifica que los índices estén optimizados
 */
export async function HEAD() {
  try {
    // Verificar que los índices requeridos estén presentes
    const indexVerification = await mongoDBOptimizationService.verifyRequiredIndexes();
    
    return new NextResponse(null, {
      status: indexVerification.allPresent ? 200 : 503,
      headers: {
        'X-ATLAS-Search-Status': indexVerification.allPresent ? 'OPTIMAL' : 'DEGRADED',
        'X-ATLAS-Indexes-Present': indexVerification.present.join(','),
        'X-ATLAS-Indexes-Missing': indexVerification.missing.join(','),
        'X-ATLAS-Timestamp': new Date().toISOString()
      }
    });
  } catch (error: any) {
    return new NextResponse(null, {
      status: 503,
      headers: {
        'X-ATLAS-Search-Status': 'ERROR',
        'X-ATLAS-Error': error.message,
        'X-ATLAS-Timestamp': new Date().toISOString()
      }
    });
  }
}
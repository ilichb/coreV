import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { logger } from '../../../../lib/utils/logger';

const FALLBACK_SCORECARDS = [
  {
    id: 'fb-1',
    proponent_did: 'did:key:z6MkpTHR8VvYSS9i7fzh5yKk9DSh1t7A9',
    content: {
      'A. Problema': { clarity: 95, context: 'Reactor core synchronization latency in high-pressure environments.' },
      'B. Límites': { clarity: 88, context: 'Limited to sub-millisecond precision requirements.' },
      'C. Especificación Técnica': { clarity: 92, context: 'Implementing AVIP v2.0 with BullMQ backoff.' },
      'D. Esfuerzo': { clarity: 85, context: 'Estimated 400 man-hours for core implementation.' }
    },
    clarity_delta: 90,
    status: 'VALIDATED',
    created_at: new Date().toISOString()
  },
  {
    id: 'fb-2',
    proponent_did: 'did:key:z6MkiYpA7G5mG9...',
    content: {
      'A. Problema': { clarity: 82, context: 'Fragmented data across multiple DAO layers.' },
      'B. Límites': { clarity: 75, context: 'Compatibility with EIP-712 and Ed25519.' },
      'C. Especificación Técnica': { clarity: 80, context: 'Cross-DAO coordination bridge using Vara Network.' },
      'D. Esfuerzo': { clarity: 70, context: 'Strategic integration phase.' }
    },
    clarity_delta: 77,
    status: 'PENDING',
    created_at: new Date(Date.now() - 3600000).toISOString()
  }
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit') || '10';

  try {
    const result = await Promise.race([
      supabase
        .from('scorecards')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(parseInt(limit)),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Supabase request timeout')), 10000))
    ]) as any;

    const { data, error } = result;

    if (error || !data || data.length === 0) {
      if (error) logger.warn('Supabase Error (using fallback):', error.message);
      return NextResponse.json(FALLBACK_SCORECARDS);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    logger.warn(`API Warning: ${error.message}. Returning fallback data.`);
    return NextResponse.json(FALLBACK_SCORECARDS);
  }
}

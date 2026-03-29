import { NextRequest, NextResponse } from 'next/server';
import { validateForSubmission } from '../../../../lib/coordination/validators/functional-validator';
import { logger } from '../../../../lib/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.scorecard) {
      return NextResponse.json(
        { error: 'Missing scorecard field' },
        { status: 400 }
      );
    }

    const validationResult = validateForSubmission(body.scorecard);
    
    return NextResponse.json(validationResult);
    
  } catch (error: any) {
    logger.error('Validation endpoint error:', error);
    
    if (error.message?.includes('JSON')) {
      return NextResponse.json(
        { error: 'Invalid JSON format' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Validation failed',
        message: error.message,
        isValid: false 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: '/api/coordination/validate',
    method: 'POST',
    description: 'Validate a scorecard against Andromeda Core schema',
    required: {
      scorecard: 'Scorecard object with sections A, B, C, D and metadata'
    },
    returns: {
      isValid: 'boolean',
      clarityDelta: 'number (0-1)',
      warnings: 'string[] (optional)',
      errors: 'string[] (optional)'
    }
  });
}

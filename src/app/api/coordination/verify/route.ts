import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return NextResponse.json({ 
    valid: false, 
    code: 'ANDR-IFC-503',
    message: 'Service temporarily unavailable for compilation'
  });
}

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { did } = body;
    if (!did) {
      return NextResponse.json({ error: 'Missing did' }, { status: 400 });
    }
    const nonce = Math.random().toString(36).substring(2, 15);
    return NextResponse.json({
      challenge: {
        nonce,
        did,
        purpose: 'scorecard_submission',
        expiresIn: 300,
        expiresAt: new Date(Date.now() + 300000).toISOString(),
      },
      signingInstructions: 'Sign the nonce with your wallet.',
    });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address');
  if (!address) {
    return NextResponse.json({ error: 'Missing address' }, { status: 400 });
  }
  const did = `did:andromeda:eth:${address}`;
  const nonce = Math.random().toString(36).substring(2, 15);
  return NextResponse.json({
    challenge: {
      nonce,
      did,
      purpose: 'scorecard_submission',
      expiresIn: 300,
      expiresAt: new Date(Date.now() + 300000).toISOString(),
    },
    signingInstructions: 'Sign the nonce with your wallet.',
  });
}

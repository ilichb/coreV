import { NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

const MAINNET_RPC = process.env.SOLANA_MAINNET_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=52d3adb1-efd3-4784-9385-a4b119fa8595';
const GOV_PROGRAM = 'GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw';

const SOLANA_DAOS = [
  {
    name: 'BonkDAO',
    realm: '84pGFuy1Y27ApK67ApethaPvexeDWA66zNV8gm38TVeQ',
    token: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    governances: [
      'Gq7t35cbpyd7C6p1jyYiRGGedzsGKyroZZU4TD8yUcEL',
      'Uq5BRkVfdBpMknZJHw6huS3dunEgJpUDv3M2DG3BfQg',
      '4wjtEVFwAThKuDapQh7FtfoS9uXqfLge8nuCHzr45Zk',
    ]
  },
];

const PROPOSAL_STATES: Record<number, string> = {
  0: 'Draft', 1: 'SigningOff', 2: 'Voting', 3: 'Succeeded',
  4: 'Executing', 5: 'Completed', 6: 'Cancelled', 7: 'Defeated', 8: 'ExecutingWithErrors'
};

async function rpcCall(method: string, params: any[]) {
  const res = await fetch(MAINNET_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(20000),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.result;
}

function extractStringsFromBuffer(buf: Buffer): string[] {
  const strings: string[] = [];
  const text = buf.toString('latin1');
  const matches = text.match(/[A-Za-z][A-Za-z0-9 \-_:#\.]{5,120}/g) || [];
  return matches.filter(s => s.trim().length > 5).slice(0, 5);
}

function parseProposal(pubkey: string, data: string, daoName: string, realm: string) {
  const raw = Buffer.from(data, 'base64');
  const discriminator = raw[0];
  if (discriminator !== 14) return null;

  const state = raw[65];
  const strings = extractStringsFromBuffer(raw);

  // El título siempre es el segundo string (el primero es "Approve")
  const titleCandidates = strings.filter(s => s !== 'Approve' && s.length > 5);
  const title = titleCandidates[0] || `Proposal ${pubkey.slice(0, 8)}`;
  const description = titleCandidates[1] || '';

  return {
    proposal_id: pubkey,
    dao_identifier: daoName.toLowerCase().replace(' ', '-'),
    ecosystem: 'solana',
    title,
    description: description.slice(0, 200),
    status: PROPOSAL_STATES[state] || 'Unknown',
    state_code: state,
    realm,
    governance: raw.slice(1, 33).toString('hex'),
    program: GOV_PROGRAM,
    explorer_url: `https://app.realms.today/dao/${realm}/proposal/${pubkey}`,
    builder_did: null, // Se completará con voters
    tags: ['solana', 'governance', 'realms', daoName.toLowerCase().replace(' ', '-')],
  };
}

async function fetchGovernanceProposals(governance: string, daoName: string, realm: string, limit = 20) {
  const result = await rpcCall('getProgramAccounts', [
    GOV_PROGRAM,
    {
      encoding: 'base64',
      filters: [{ memcmp: { offset: 1, bytes: governance } }],
      withContext: false,
    }
  ]);

  if (!Array.isArray(result)) return [];

  const proposals = result
    .map((item: any) => parseProposal(item.pubkey, item.account.data[0], daoName, realm))
    .filter(Boolean)
    .slice(0, limit);

  return proposals;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const daoFilter = searchParams.get('dao');
  const limit = parseInt(searchParams.get('limit') || '20');

  try {
    const targets = daoFilter
      ? SOLANA_DAOS.filter(d => d.name.toLowerCase().includes(daoFilter.toLowerCase()))
      : SOLANA_DAOS;

    const allProposals: any[] = [];
    const daoResults: any[] = [];

    for (const dao of targets) {
      let daoProposals: any[] = [];

      for (const gov of dao.governances) {
        const props = await fetchGovernanceProposals(gov, dao.name, dao.realm, limit);
        daoProposals.push(...props);
      }

      daoResults.push({
        dao: dao.name,
        realm: dao.realm,
        proposalCount: daoProposals.length,
        active: daoProposals.filter(p => p.status === 'Voting').length,
        completed: daoProposals.filter(p => p.status === 'Completed').length,
      });

      allProposals.push(...daoProposals);
    }

    logger.info(`🏛️ Solana governance: ${allProposals.length} proposals from ${targets.length} DAOs`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      totalProposals: allProposals.length,
      daos: daoResults,
      proposals: allProposals.slice(0, 50),
    });

  } catch (err: any) {
    logger.error('Solana governance fetch failed:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export interface ScorecardSection {
  clarity: number;
  coherence: number;
  completeness: number;
  content: Record<string, any>;
  metadata?: {
    version: string;
    author?: string;
    timestamp: string;
  };
}

export interface Scorecard {
  "A. Problema": ScorecardSection;
  "B. Límites": ScorecardSection;
  "C. Especificación Técnica": ScorecardSection;
  "D. Esfuerzo": ScorecardSection;
  
  // Metadatos del scorecard
  metadata: {
    version: string;
    created: string;
    updated: string;
    authorDid: string;
    signature?: string; // Firma EIP-712 o Ed25519
  };
  
  // Taxonomía de industria (Índice Maestro)
  taxonomy?: {
    industryId: string;
    subIndustryId: string;
    isWeb3: boolean;
    transversalLayers?: Array<'identity' | 'privacy'>;
  };
  
  // Para firmas EIP-712
  eip712Domain?: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  };
}

export interface SignedScorecard extends Scorecard {
  signature: string;
  signer: string;
  timestamp: string;
  nonce: string;
}

export interface AndromedaDID {
  method: 'andromeda';
  chain: 'eth' | 'sol' | 'pol' | 'avax';
  address: string;
  timestamp?: string;
}

export function parseDid(did: string): AndromedaDID {
  const parts = did.split(':');
  if (parts.length !== 4 || parts[0] !== 'did' || parts[1] !== 'andromeda') {
    throw new Error(`Invalid DID format: ${did}. Expected: did:andromeda:{chain}:{address}`);
  }
  
  return {
    method: 'andromeda',
    chain: parts[2] as AndromedaDID['chain'],
    address: parts[3]
  };
}

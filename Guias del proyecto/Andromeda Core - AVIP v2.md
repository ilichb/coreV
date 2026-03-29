# Andromeda Core \- AVIP v2.0 Reconstruction Guide

This document contains all technical specifications needed to rebuild the lost project. Follow chronologically.  
---

## 1\. Project Stack

* Next.js (App Router), TypeScript strict mode, npm  
* MongoDB Atlas (primary database)  
* Supabase (scorecard storage \+ Atlas search)  
* Redis (rate limiting \+ BullMQ queues) – in‑memory fallback allowed  
* The Graph (Rootstock governance data)  
* IPFS / Pinata (scorecard JSON storage)  
* Vara Network (optional blockchain anchoring)  
* Viem \+ Ethers (blockchain adapters)

---

## 2\. Core Directories (create these)

text  
src/  
  app/  
    api/  
      atlas/search/  
      daos/register/  
      docs/  
      health/  
      intelligence/  
        ecosystem-status/  
        telemetry/  
        network-graph/  
    \[locale\]/  
      intelligence/page.tsx  
      atlas/page.tsx  
  lib/  
    services/  
      reputation/  
        reputation-engine.service.ts  
      builder-ingestion.service.ts  
      ecosystem-ingestion.service.ts  
      security/  
        secret-manager.service.ts  
    connectors/  
      rootstock-connector.ts  
      optimism-connector.ts  
      arbitrum-connector.ts  
      algorand-connector.ts  
    blockchain/  
      avip-viem-adapter.ts  
      avip-adapter.ts (deprecate – delete later)  
    infrastructure/  
      redis.ts  
      mongodb.ts  
scripts/  
  check-security.js  
  test-integration.js  
  sync-ecosystems.js  
data/  
  avip-fallback.json  
  avip-dlq.json  
logs/  
  atlas\_audit.log  
---

## 3\. Environment Variables (.env.local)

env  
\# Required  
MONGODB\_URI=mongodb+srv://...  
NEXT\_PUBLIC\_SUPABASE\_URL=https://...  
NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY=...  
THEGRAPH\_API\_KEY=ba67e7cdb924e6ffd4003a464829e969   \# rotated later

\# Optional / Production  
AVIP\_ENABLED=false  
AVIP\_CONTRACT\_ADDRESS=0x...  
NEXT\_PUBLIC\_WALLETCONNECT\_PROJECT\_ID=...  
PINATA\_JWT=...  
VARA\_NETWORK=testnet  
---

## 4\. Reputation Engine – reputation-engine.service.ts

Implement formulas from Core Paper v3.1:  
typescript  
// Asymmetric decay  
R(t) \= R0 \* exp(-λ \* t)  
λ\_pos \= 0.001   // positive events  
λ\_neg \= 0.003   // negative events (3x faster)

// Behavioral confidence  
C \= sigmoid(anomaly\_score)  
w\_effective \= w\_base \* C²

// Anomaly detection – Shannon entropy  
H(X) \= \- Σ p(x) \* log2(p(x))  
threshold \= 3.8 bits

// Multidimensional score (0..100)  
technical\_weight \= 0.5  
governance\_weight \= 0.3  
community\_weight \= 0.2

min\_confidence \= 0.1   // never silence completely  
Output struct (stored in milestone metadata):  
typescript  
avipScore: {  
  total: number,      // 0..100  
  technical: number,  
  governance: number,  
  community: number,  
  behavioralConfidence: number, // 0..1  
  isAnomaly: boolean,  
  decayedAt: string   // ISO timestamp  
}  
---

## 5\. Builder Ingestion – builder-ingestion.service.ts

Flow:

1. Fetch builders from Rootstock Collective  
2. For each builder, call reputationEngineService.calculateScore(builderData)  
3. Store complete avipScore in milestone metadata  
4. Upsert to MongoDB (upsertMilestone)  
5. Enqueue scorecard to avipViemAdapter.submitScorecard() (non‑blocking)

Critical fix: use impactScore (calculated by AVIP) for reputation, not a default 75\.  
In BuilderRanking.tsx:  
typescript  
// Before: reputationScore: item.metadata?.impactMetrics?.reputation || 75  
// After:  
reputationScore: item.metadata?.avipScore?.total || 0  
---

## 6\. AVIP Adapter – avip-viem-adapter.ts (hardened)

Features:

* Zod schema validation for scorecards  
* Idempotency via hash tracking (prevent replays)  
* Dead Letter Queue for failed batches (data/avip-dlq.json)  
* Automatic retries: 3 attempts \+ exponential backoff  
* Mutex for concurrency control  
* Batch submission (default size 10, configurable)  
* Fallback storage when AVIP unavailable (data/avip-fallback.json)  
* Health check method: isHealthy()

Conditional logic:  
typescript  
if (process.env.AVIP\_ENABLED \=== 'true') {  
  // submit to blockchain  
} else {  
  // store locally in fallback JSON  
}  
---

## 7\. The Graph Integration – rootstock-connector.ts

Do NOT hardcode API key. Use process.env.THEGRAPH\_API\_KEY.  
Correct queries (based on actual schema):  
graphql  
\# Proposals query  
query {  
  proposals(first: 100\) {  
    id  
    title  
    state        \# PENDING, ACTIVE, etc.  
    rawState     \# 0..7 numeric  
    votesFor  
    votesAgainst  
    votesAbstains  
    votesTotal  
    voteStart  
    voteEnd  
  }  
}

\# Votes query  
query($proposalId: String\!) {  
  voteCasts(where: { proposal: $proposalId }) {  
    voter  
    weight      \# not "votes"  
    support     \# 0 \= AGAINST, 1 \= FOR  
  }  
}  
State mapping:

* 0 → PENDING, 1 → ACTIVE, 2 → CANCELED, 3 → DEFEATED  
* 4 → SUCCEEDED, 5 → QUEUED, 6 → EXPIRED, 7 → EXECUTED

---

## 8\. API Endpoints

### POST /api/daos/register

* Rate limit: 5 per hour per IP  
* 3‑layer validation: Zod schema, blockchain contract check, Snapshot/TheGraph verification  
* On success: create Atlas milestone \+ generate initial AVIP scorecard \+ async notification

### GET /api/atlas/search

* Rate limit: 20 per minute per IP  
* Returns results with metadata.trustScore (AVIP reputation)

### GET /api/health

Returns status of MongoDB, AVIP (if enabled), Redis (in‑memory fallback ok)

### GET /api/docs

Swagger UI (OpenAPI 3.0) – document all endpoints

### GET /api/intelligence/telemetry

Returns ecosystem status (Rootstock, Optimism, Arbitrum, Algorand) using THEGRAPH\_API\_KEY  
---

## 9\. Redis Service – redis.ts (in‑memory fallback)

If Redis not available, use this minimal implementation:  
typescript  
export class RedisService {  
  private store \= new Map()  
  async get(key: string) { return this.store.get(key) || null }  
  async set(key: string, value: any, ttl?: number) { this.store.set(key, value); return true }  
  async del(key: string) { return this.store.delete(key) }  
  async incr(key: string) { let v \= (this.store.get(key) || 0\) \+ 1; this.store.set(key, v); return v }  
  async expire(key: string, seconds: number) { /\* ignore for in‑memory \*/ return true }  
}  
export const redisService \= new RedisService()  
---

## 10\. Security Fixes (hardcoded credentials)

Files that contained hardcoded API keys (must be removed):

* src/lib/connectors/rootstock-connector.ts – replace 'ba67e7cd...' with process.env.THEGRAPH\_API\_KEY  
* src/app/api/intelligence/telemetry/route.ts – same fix  
* src/lib/wallet/config.ts – remove hardcoded WalletConnect project ID

Run scripts/check-security.js to scan for patterns: /\[a-f0-9\]{32,}/, /(api\[\_-\]?key|secret|token)/i  
---

## 11\. Missing Files (add these to git)

Three files were missing causing Vercel build failures:

1. src/lib/infrastructure/redis.ts – see section 9  
2. src/lib/services/reputation/reputation-engine.service.ts – section 4  
3. src/lib/services/security/secret-manager.service.ts – basic implementation:

typescript  
export class SecretManagerService {  
  async getSecret(key: string): Promise\<string | null\> {  
    return process.env\[key\] || null  
  }  
  async rotateSecret(key: string): Promise\<void\> {  
    // placeholder – implement with AWS KMS if needed  
  }  
}  
---

## 12\. Deployment to Vercel

Repository: https://github.com/ilichb/CoreVercel branch: AndroDev  
Set environment variables in Vercel dashboard (same as .env.local but with production values).  
After deploy, verify:  
bash  
curl https://andromeda-core.vercel.app/api/health  
If MongoDB IP whitelist needed: add Vercel CIDRs 76.76.21.0/24 and 76.223.92.0/24.  
---

## 13\. Chronological Reconstruction Steps

1. Set up empty Next.js \+ TypeScript project with strict mode.  
2. Add MongoDB client (mongodb.ts singleton, lazy connection).  
3. Create reputation engine (section 4\) with all formulas.  
4. Create builder ingestion service (section 5\) linking reputation engine.  
5. Create AVIP Viem adapter (section 6\) with fallback and DLQ.  
6. Create Redis service (section 9\) in‑memory fallback.  
7. Add The Graph connector (section 7\) using env var.  
8. Build API endpoints (section 8).  
9. Add security scanning script (check-security.js).  
10. Fix hardcoded keys (section 10).  
11. Add missing files (section 11\) to repository.  
12. Test locally: npm run dev, then npm run build.  
13. Deploy to Vercel (section 12).  
14. Enable AVIP in production by setting AVIP\_ENABLED=true.

---

## 14\. Common Build Errors & Fixes

| Error | Fix |
| :---- | :---- |
| Cannot find module '../../lib/infrastructure/redis' | Add redis.ts (section 9\) |
| Cannot find module './reputation/reputation-engine.service' | Add file (section 4\) |
| THEGRAPH\_API\_KEY invalid characters in Vercel | Use exact name THEGRAPH\_API\_KEY (no hyphens/dots) |
| MongoDB connection timeout | Whitelist Vercel IPs in Atlas |
| Build timeout (\>50MB) | Use dynamic imports, run bundle-analyzer |
| All builders show 75 reputation | Fix default value to 0 in BuilderRanking.tsx |

---

## 15\. Testing Commands

bash  
\# Start dev server  
npm run dev \-- \-p 4002

\# Run builder sync (Rootstock)  
npm run test:sync

\# Run ecosystem sync (Optimism, Arbitrum, Algorand)  
node scripts/sync-ecosystems.js

\# Check security (hardcoded keys)  
node scripts/check-security.js

\# Health check  
curl http://localhost:4002/api/health

\# Test DAO registration  
curl \-X POST http://localhost:4002/api/daos/register \\  
  \-H "Content-Type: application/json" \\  
  \-d '{"name":"Test DAO","contractAddress":"0x...","network":"ethereum"}'  
---

End of guide. Follow sections sequentially to rebuild the lost project.  

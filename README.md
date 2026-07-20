# Andromeda Core — RIF Activation Engine & FES Infrastructure

[![Status](https://img.shields.io/badge/Status-Production%20Ready-14F195?style=for-the-badge)]()
[![Rootstock Governance](https://img.shields.io/badge/Rootstock%20Governance-Mainnet%20Live-00E5FF?style=for-the-badge)]()
[![Rootstock Rewards](https://img.shields.io/badge/Rootstock%20Rewards-Mainnet%20Live-14F195?style=for-the-badge)]()
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)]()

**Andromeda Core** is a verifiable reputation protocol and economic activation engine for DAO ecosystems. We provide a decentralized trust layer for builders, DAOs, and autonomous agents, with Mainnet data infrastructure that already extracts, normalizes, and persists governance and staking information from the **Rootstock Collective** — live 24/7 at [core.andromedacomputer.net](http://core.andromedacomputer.net).

> 🎯 **Mission:** Convert the 97.7% idle RIF supply into productive capital through an activation dashboard, automated impact reports, and external data feeds for the **FES (Funding Efficiency Score)** developed by the Rootstock Lab.

---

## ⚡ What Already Exists for Rootstock (Live on Mainnet)

Andromeda Core has **~7,200 lines of 100% functional TypeScript code**, of which **~1,650 lines are live connectors** already reading Rootstock Mainnet data (Governance Subgraph, Rewards Subgraph, Collective REST API, and direct RPC calls) — deployed 24/7 on Vercel. The remaining ~5,500 lines are the reputation engine, data persistence layer, and dashboard UI — all processing and visualizing that data in real time. This is not a proposal — it is live infrastructure.

### 🔌 Network Connectors (3 Live Data Channels)

| Component | Lines | Status | Function |
|-----------|--------|--------|---------|
| `rootstock-connector.ts` | 776 | ✅ **100% Functional** | Aggregates data from the **Governance Subgraph**, **Rewards Subgraph** (staking histories, gauge allocations), and the **Collective REST API** (`app.rootstockcollective.xyz/api/builders`). Built-in Redis cache with 5 min TTL. |
| `rootstock-connector.ts` (services) | 330 | ✅ **100% Functional** | 3-layer resilience architecture: SnapshotClient → Tally API → Direct RPC (`eth_call` to Governor `0x43867c46...`). |
| `rpc-balancer.ts` | 206 | ✅ **100% Functional** | Balancer with 3 Rootstock endpoints (`public-node.rsk.co`, `mainnet.sovryn.app/rpc`, premium RPC). Health checks every 60s, weighted selection by health score, automatic failover. |
| `snapshot-connector.ts` | 439 | ✅ **100% Functional** | Queries `hub.snapshot.org/graphql` for Rootstock proposals. |
| `thegraph-client.ts` | 228 | ✅ **100% Functional** | The Graph client with rate limiting, processing queue, and predefined queries for the Rootstock Governance Subgraph. |

### 🧠 AVIP v2.0 Reputation Engine

| Component | Lines | Status | Function |
|-----------|--------|--------|---------|
| `reputation-engine.service.ts` | 123 | ✅ **100% Functional** | Asymmetric exponential decay (`λ_pos=0.001`, `λ_neg=0.003`), anomaly detection via Shannon entropy, dimensional weighting (Technical 0.5, Governance 0.3, Community 0.2), confidence factor with 70% floor. |
| `rootstock.normalizer.ts` | 90 | ✅ **100% Functional** | Translates raw subgraph data (staking, proposals, votes, gauges) into AVIPNormalizedInput. **Uses logarithmic scale for staking** — specifically designed to prevent whale-driven metric inflation, addressing the bias identified in the Rootstock Lab's [2603] research paper. |
| `avip-scale.adapter.ts` | 38 | ✅ **100% Functional** | Bidirectional conversion AVIP (0..100) ↔ Rootstock UI (0..999) with canonical factor 9.99. |

### 🗄️ Data Infrastructure & Persistence

| Component | Lines | Status | Function |
|-----------|--------|--------|---------|
| `atlas-ingestion.service.ts` | 858 | ✅ **100% Functional** | Mass ingestion to MongoDB Atlas with milestone transformation, AVIP calculation, industry mapping, paginated search, detailed statistics, health check. |
| `atlas-orchestrator.ts` | 240 | ✅ **100% Functional** | Full orchestrator: Transformation (M0) → Audit (M1) → Registry (M2) → Immutability. |
| `atlas-registry.ts` | 304 | ✅ **100% Functional** | Immutable registry with dual persistence: Supabase (primary) + MongoDB Atlas (fault-tolerant secondary). |
| `ipfs-adapter.ts` | 111 | ✅ **100% Functional** | IPFS upload/download via Pinata with exponential backoff retries (3 attempts), 60s timeout. |
| `redis.ts` | 47 | ✅ **100% Functional** | Redis service with get/set, rate limiting, health check. |
| `ecosystem-ingestion.service.ts` | 295 | ✅ **100% Functional** | Full pipeline: Fetch → Normalize → IPFS → Registry → Atlas → Anchor. |

### 🖥️ Dashboard UI

| Component | Lines | Status | Function |
|-----------|--------|--------|---------|
| `RootstockBuilderScorecard.tsx` | 429 | ✅ **100% Functional** | React component with reputation bar (0-999), stats grid (proposals, votes, staking, days), governance history, real AVIP engine breakdown, anomaly detection, tiers (Elite/Verified/Active/Emerging). |

### 📜 Sync Scripts

| Script | Status | Function |
|--------|--------|---------|
| `scripts/sync-rootstock.ts` | ✅ **Functional** | Full Rootstock ecosystem synchronization. |
| `scripts/test-rootstock-integration.ts` | ✅ **Functional** | Integration test: Governance Subgraph, Rewards Subgraph + Scorecard, Snapshot Decisions. |
| `scripts/test-rootstock-real.ts` | ✅ **Functional** | Test with real Rootstock data (requires THEGRAPH_API_KEY). |
| `src/scripts/sync-engine.ts` | ✅ **Functional** | Multi-ecosystem sync engine. |

---

## 🧪 FES Pilot — Funding Efficiency Score Experiment

The **FES (Funding Efficiency Score) Pilot** is a live A/B experiment on Rootstock Mainnet designed to test whether personalized staking yield projections can reactivate inactive RIF holders. Built on top of Andromeda Core's existing infrastructure.

### 🔍 Detection & Assignment Pipeline

| Component | Lines | Status | Function |
|-----------|--------|--------|---------|
| `inactive-holder.service.ts` | — | ✅ **100% Functional** | Scans Rewards Subgraph for backers with >500 RIF, >30 days inactive, pre-June 2026. Batches 20 RPC calls in parallel with Redis caching. |
| `cohort-assignment.service.ts` | — | ✅ **100% Functional** | Deterministic stratified A/B assignment. Whales (≥1M RIF) → VIP cohort. Remaining pool split via alternate-pair swap (deviation <0.5%). |
| `yield-projection.service.ts` | 177 | ✅ **100% Functional** | Calculates projected RIF yield based on wallet balance and average APR from active builders in the Rewards Subgraph. |
| `message-templates.ts` | 182 | ✅ **100% Functional** | Bilingual (EN/ES) templates: **Cohort A** (control — informational), **Cohort B** (treatment — personalized yield + builder recommendations), **VIP** (team outreach). |
| `reactivation-tracker.service.ts` | — | ✅ **100% Functional** | Queries subgraph `lastBlockNumber` delta >10 blocks from checkpoint to detect reactivations. |

### 🗄️ Storage & Persistence

| Component | Lines | Status | Function |
|-----------|--------|--------|---------|
| `fes-storage.service.ts` | 208 | ✅ **100% Functional** | Supabase PostgreSQL: `fes_participants` (wallet, cohort, balance, status) + `fes_events` (timeline tracking). |
| `fes-view-logger.service.ts` | 304 | ✅ **100% Functional** | Logs each /preview visit to MongoDB Atlas with walletHash (SHA-256 salted — never raw addresses). Publishes daily summaries to IPFS via Pinata. |
| `fes-attribution-monitor.service.ts` | 375 | ✅ **100% Functional** | Scans `Staked` events on the Rootstock staking contract via RPC every hour. Cross-references walletHash from MongoDB to attribute stakes to the experiment. |

### 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/fes/metrics` | Aggregated pilot metrics (participants, cohorts, reactivations) |
| `GET` | `/api/fes/participants` | List all participants with cohort and status |
| `POST` | `/api/fes/track` | Run checking cycle for a wallet or all participants |
| `POST` | `/api/fes/check-wallet` | Verify a wallet: detect, assign cohort, return message |
| `GET` | `/api/fes/view-stats` | View statistics from MongoDB (total, unique, by cohort) |
| `GET` | `/api/fes/attributions` | Stake attribution summary and detail |
| `GET` | `/api/cron/fes-track` | ⏱ Cron: periodic reactivation checking (every hour) |
| `GET` | `/api/cron/fes-publish-views` | ⏱ Cron: daily view report to IPFS (00:30 UTC) |
| `GET` | `/api/cron/fes-attribution` | ⏱ Cron: hourly stake event scanning |

### 🖥️ Public & Internal Views

| Page | Route | Description |
|------|-------|-------------|
| **Wallet Verifier** | `/preview` | Public page — enter your wallet address to see your cohort message and projected yield. Logs the view anonymously. |
| **Pilot Dashboard** | `/internal/fes` | Internal dashboard (protected by `X-Internal-Key`) — shows detected holders, cohort breakdown, whales, sample messages, and manual tracking buttons. |

### 📊 Pilot Results (Week 1 — Live on Mainnet)

| Metric | Value |
|--------|-------|
| Backers scanned | 289 |
| Inactive holders detected | 21 |
| Cohort A / B / VIP | 10 / 10 / 1 |
| Largest inactive holder | 9.35M RIF (481 days inactive → VIP) |
| Cohort deviation | 0.41% |

### 📋 Scripts

| Script | Function |
|--------|----------|
| `scripts/generate-pilot-report.ts` | Generates final pilot report consolidating Supabase, MongoDB, and IPFS data. Supports `--publish` for IPFS. |

> 📖 **Full documentation:** `docs/reports/fes-pilot-fixes.md` (gap analysis) and `docs/reports/fes-pilot-progress.md` (weekly progress).

---

## 🎯 Alignment with Rootstock Collective

### 1. Co-Powering the FES (Funding Efficiency Score)

Our infrastructure is already built to feed the Rootstock Lab's FES:

**Channel 1 — TVL by Builder:**
- `fetchBuilderActivity()` extracts `backerTotalAllocation` from the Rewards Subgraph
- Direct FES metric: TVL distribution by builder and sector

**Channel 2 — Transaction Volume:**
- `fetchSubgraphProposals()` extracts `votesFor`, `votesAgainst`, `votesTotal` from the Governance Subgraph
- Direct FES metric: governance frequency and volume

**Channel 3 — New Wallets:**
- `fetchAllBuilders()` queries the Collective REST API
- Direct FES metric: newly registered builders, categorized by sector

**Resilience:** 3 levels of redundancy — Redis cache (5 min TTL), fallback to pinned data (WoodSwap, Asami.Club, Boltz), realistic synthetic data simulation.

### 2. Targeting the 97.7% Idle RIF

Our `atlas-orchestrator.ts` and `atlas-ingestion.service.ts` can be reoriented to:

1. **Index high-balance, inactive RIF wallets** on Mainnet
2. **Generate automated "Ecosystem Yield & Impact Reports"** showing:
   - Current yield if staked to top-performing builders
   - Comparison with average backer returns
   - Builders ranked by an impact signal combining FES-style economic metrics (TVL, transactions) with operational reliability (GitHub activity, proposal participation, milestone consistency)
3. **Publish to IPFS** (via `ipfs-adapter.ts`) for immutability
4. **Serve through a public dashboard** at `dev.andromedacomputer.net`

### 3. Cost Reduction & Immediate Mainnet Deployment

To eliminate treasury friction for the Collective, we have identified which components **are ready now** and which **are postponed**:

| Component | Decision | Savings |
|-----------|----------|--------|
| On-chain cryptographic registry (Solana/Vara) | ✅ **Postponed** | ~$15-20k |
| Verifiable PDF generation | ✅ **Postponed** | ~$5-8k |
| Multi-ecosystem connectors (Algorand, Polkadot, etc.) | ✅ **Omitted** | ~$10-15k |
| **~4,500 lines of essential code** | ✅ **In use now** | Full reuse |

**Proposed Milestone 1 (4-6 weeks to Mainnet):**
- Weeks 1-2: Adapt `rootstock-connector.ts` for `/api/fes/metrics` endpoint (TVL, transactions, new wallets, RIF utilization rate)
- Weeks 3-4: Public activation dashboard based on `RootstockBuilderScorecard.tsx`
- Weeks 5-6: Vercel deployment + API documentation

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    ANDROMEDA CORE ENGINE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │  Connectors   │    │   AVIP v2.0  │    │    Atlas     │       │
│  │               │───▶│   Engine     │───▶│  Orchestrator│       │
│  │ • Rootstock   │    │              │    │              │       │
│  │ • Snapshot    │    │ • Exponential│    │ • M0: Onto-  │       │
│  │ • Tally       │    │   decay      │    │   logy       │       │
│  │ • Direct RPC  │    │ • Shannon    │    │ • M1: Audit  │       │
│  │ • The Graph   │    │   entropy    │    │ • M2: Regis- │       │
│  └──────┬───────┘    │ • Behavioral  │    │   try        │       │
│         │            │   confidence  │    └──────┬───────┘       │
│         │            └──────┬───────┘           │               │
│         │                   │                   │               │
│         ▼                   ▼                   ▼               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  Persistence Layer                        │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌───────────┐  │    │
│  │  │ Supabase│  │ MongoDB │  │  IPFS   │  │   Redis   │  │    │
│  │  │  (SQL)  │  │ (Atlas) │  │ (Pinata)│  │  (Cache)  │  │    │
│  │  └─────────┘  └─────────┘  └─────────┘  └───────────┘  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              API Layer (Next.js 16)                       │    │
│  │  /api/fes/metrics  /api/rootstock/builders               │    │
│  │  /api/coordination/publish  /api/atlas/search            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Dashboard UI (React 19)                      │    │
│  │  RootstockBuilderScorecard.tsx  Atlas Explorer           │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘

> 🎮 **Explore the interactive architecture:** [dev.andromedacomputer.net/rootstock-graphics.html](https://dev.andromedacomputer.net/rootstock-graphics.html) — animated SVG diagrams with hover on each layer and detailed explanations.
```

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Next.js 16 (App Router), TypeScript 5.9 |
| **Frontend** | React 19, Tailwind CSS 4, Radix UI, Framer Motion |
| **Blockchain** | Rootstock (RPC + Subgraphs), EVM (EIP-712), Solana (Anchor) |
| **Infrastructure** | MongoDB Atlas, IPFS (Pinata), Redis (ioredis), Supabase |
| **Reputation** | AVIP v2.0 (Shannon entropy, asymmetric decay, anomaly detection) |
| **Testing** | Jest, tsx (stress/chaos tests) |

---

## 📁 Project Structure

```
andromeda-rootstock/
├── src/
│   ├── app/                    # Next.js App Router (API routes, i18n pages)
│   │   ├── api/
│   │   │   ├── fes/            # FES endpoints (metrics, dashboard)
│   │   │   ├── rootstock/      # Rootstock endpoints (builders, scorecards)
│   │   │   ├── coordination/   # Scorecard publishing
│   │   │   └── atlas/          # ATLAS search & stats
│   │   ├── coordination/       # UI pages
│   │   └── atlas/              # ATLAS explorer
│   ├── components/
│   │   └── coordination/
│   │       └── scorecards/
│   │           └── RootstockBuilderScorecard.tsx  # Rootstock Dashboard
│   ├── lib/
│   │   ├── connectors/         # rootstock-connector.ts (776 lines)
│   │   ├── infrastructure/
│   │   │   └── clients/        # rpc-balancer.ts, thegraph-client.ts
│   │   ├── services/
│   │   │   ├── reputation/     # AVIP engine, normalizers, scale adapter
│   │   │   ├── atlas/          # atlas-ingestion, builder-ingestion
│   │   │   ├── coordination/   # orchestrator, auditor, registry, IPFS
│   │   │   └── storage/        # Pinata service
│   │   └── utils/              # Logger, helpers
│   ├── scripts/                # sync-engine, telegram-bot
│   └── types/                  # Scorecard, DID parsers
├── scripts/                    # sync-rootstock, tests
├── packages/
│   ├── avip-contracts/         # AVIP smart contracts (Solidity)
│   ├── auto-validator/         # Scorecard validation engine
│   └── supabase/               # Database migrations
└── docs/
    └── reports/                # Technical audit reports
```

---

## 🧪 Running Locally

### Prerequisites
- Node.js 20+ and npm
- A Rootstock wallet (MetaMask) for signature testing

### Setup

```bash
git clone https://github.com/AndromedaCore/Rootstock.git
cd Rootstock
npm install
```

### Environment Variables
Create `.env.local` with:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
PINATA_JWT=...
THEGRAPH_API_KEY=...
REDIS_URL=redis://localhost:6379
```

> 📝 **Note:** `THEGRAPH_API_KEY` is free at [thegraph.com/studio](https://thegraph.com/studio). Without it, the system runs on simulated data (via `getSimulatedDecisions()`).

### Development

```bash
npm run dev
# Opens http://localhost:3000
```

### Rootstock Sync

```bash
npx tsx scripts/sync-rootstock.ts          # Full synchronization
npx tsx scripts/test-rootstock-real.ts     # Test with real data
npx tsx src/scripts/sync-engine.ts         # Multi-ecosystem engine
```

### Tests

```bash
npm test                    # Unit tests
npm run test:stress         # AVIP stress tests
npm run test:chaos          # Chaos engineering
```

---

## 📡 Public API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/fes/metrics` | Aggregated FES metrics (TVL, transactions, new wallets, RIF utilization rate) |
| `GET` | `/api/rootstock/builders` | List of Rootstock Collective builders |
| `GET` | `/api/rootstock/builders?address=0x...` | Individual builder scorecard |
| `POST` | `/api/coordination/publish` | Publish signed Scorecard |
| `GET` | `/api/atlas/search?q=...` | Search ATLAS milestones |
| `GET` | `/api/atlas/stats` | Detailed ATLAS statistics |

Full Swagger documentation available at `/docs` when the server is running.

---

## 📊 Comparison with Existing Solutions

| Feature | Andromeda Core (AVIP) | Gitcoin Passport | EAS |
|---------|----------------------|------------------|-----|
| **Immutability** | ✅ Canonical hash + IPFS | ❌ Revocable | ❌ Revocable |
| **Portability** | ✅ Rootstock, EVM, Solana, Algorand | ❌ Gitcoin only | ❌ On-chain fixed |
| **Sybil Resistance** | ✅ Shannon entropy + graph analysis | ❌ Basic aggregation | ❌ None |
| **Multidimensional Score** | ✅ Technical, governance, community | ❌ Humanhood only | ❌ Plain text |
| **Logarithmic Scale** | ✅ Anti-whale inflation | ❌ | ❌ |
| **Mainnet Connection** | ✅ Live on Rootstock Mainnet 24/7 | ✅ | ✅ |

> *Andromeda does not compete with these solutions; it complements them. AVIP consumes data from EAS and Passport as additional signals in its trust engine.*

---

## 🗺️ Roadmap

| Phase | Status |
|-------|--------|
| **Phase 1 — Foundation** (Scorecard + AVIP + Atlas) | ✅ **Complete** |
| **Phase 1.5 — RIF Activation Engine** (FES Dashboard, impact reports) | 🟡 **Q2 2026** |
| **Phase 2 — Co-governance** (Active Builder Assembly) | 🟡 **Q2 2026** |
| **Phase 3 — Distributed Pinning** (Community IPFS nodes) | 🟡 **Q3 2026** |
| **Phase 4 — Full DAO** (No privileged team keys) | 🔲 **Q4 2026** |

---

## 🤝 Contributing

Contributions are welcome. We need help with:

- **Additional blockchain connectors** (NEAR, ICP) — see [Roadmap](#-roadmap) for priorities
- **ML models for anomaly detection** — contact `research@andromedacomputer.net` for training dataset access
- **Translations and documentation** — JSON files in `src/i18n/`
- **Security audits** — report vulnerabilities to `security@andromedacomputer.net`

---

## 📄 License

MIT © 2026 Andromeda Computer. Public good infrastructure.

---

<p align="center">
  Built with <strong>clarity</strong>, <strong>immutability</strong>, and <strong>hard industrial design</strong>.
</p>

<p align="center">
  <a href="http://core.andromedacomputer.net">🌐 Dashboard</a> ·
  <a href="https://dev.andromedacomputer.net/rootstock-graphics.html">📊 Graphics</a> ·
  <a href="https://dev.andromedacomputer.net/rootstock-paper.html">📄 Paper</a> ·
  <a href="http://core.andromedacomputer.net/verify.html">🛡️ Verifier</a>
</p>
// Deploy trigger lun 20 jul 2026 11:01:03 -04

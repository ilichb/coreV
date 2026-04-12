<!--
  ANDROMEDA CORE – Verifiable Reputation Infrastructure for Web3
  © 2026 Andromeda Computer
-->

<p align="center">
  <img src="https://dev.andromedacomputer.net/logo-andromeda.png" alt="Andromeda Core" width="120"/>
  <h1 align="center">Andromeda Core</h1>
  <p align="center"><strong>Verifiable Reputation Infrastructure for Web3</strong><br/>
  AVIP · Scorecard · Atlas · X402</p>
</p>

<p align="center">
  <a href="#"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="MIT License"/></a>
  <a href="#"><img src="https://img.shields.io/badge/Next.js-16.1-black?logo=next.js" alt="Next.js 16"/></a>
  <a href="#"><img src="https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript" alt="TypeScript"/></a>
  <a href="#"><img src="https://img.shields.io/badge/Algorand-X402-00A8B0?logo=algorand" alt="Algorand X402"/></a>
  <a href="#"><img src="https://img.shields.io/badge/Vara-Network-6a1b9a?logo=polkadot" alt="Vara Network"/></a>
  <a href="#"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome"/></a>
</p>

<details>
<summary><b>📖 Table of Contents</b> (click to expand)</summary>

- [What is Andromeda Core?](#-what-is-andromeda-core)
- [Why Verifiable Reputation?](#-why-verifiable-reputation)
- [Key Technologies](#-key-technologies)
  - [AVIP v2.0 – Andromeda Verifiable Immutable Proof](#avip-v20--andromeda-verifiable-immutable-proof)
  - [Scorecard – The Canonical Specification Format](#scorecard--the-canonical-specification-format)
  - [Atlas Engine – Real‑time Data Ingestion](#atlas-engine--real‑time-data-ingestion)
  - [Sincerity API – Portable Credentials](#sincerity-api--portable-credentials)
- [Algorand Integration: X402 & Validator Rewards](#-algorand-integration-x402--validator-rewards)
- [System Architecture](#-system-architecture)
- [Comparison with Existing Solutions](#-comparison-with-existing-solutions)
- [Project Structure](#-project-structure)
- [Installation & Setup](#-installation--setup)
- [API Endpoints](#-api-endpoints)
- [Roadmap & Governance](#-roadmap--governance)
- [Contributing](#-contributing)
- [License](#-license)

</details>

---

## 🔷 What is Andromeda Core?

**Andromeda Core** is a decentralized infrastructure layer that transforms the ambiguity of human coordination into **executable specifications**, **verifiable reputation**, and **immutable proofs**. It serves as the trust backbone for DAOs, protocols, and Web3 marketplaces, enabling objective assessment of builders and projects based on cryptographic evidence — not narratives or social capital.

> 🧠 _AVIP v2.0 – Andromeda Verifiable Immutable Proof: portable reputation across chains, with asymmetric decay and anomaly detection._

---

## ❓ Why Verifiable Reputation?

Current Web3 coordination suffers from **structural opacity**:

- **Ambiguous proposals** → funds allocated based on rhetoric, not verifiable specs.
- **Fragmented reputation** → each DAO rebuilds trust from scratch.
- **Sybil & farm attacks** → low-cost manipulation of voting and grants.

Andromeda Core solves these with a **trilemma‑breaking architecture**:

<table>
<tr>
<th>Problem</th>
<th>Andromeda Solution</th>
</tr>
<tr>
<td>Ambiguity</td>
<td><b>Scorecard</b> – coercive format forcing complete specification.</td>
</tr>
<tr>
<td>Fragmentation</td>
<td><b>AVIP</b> – portable, immutable reputation graph across chains.</td>
</tr>
<tr>
<td>Manipulation</td>
<td><b>Anomaly detection</b> + <b>asymmetric decay</b> + <b>reputation staking</b>.</td>
</tr>
</table>

---

## ⚙️ Key Technologies

### AVIP v2.0 – Andromeda Verifiable Immutable Proof

AVIP is the core reputation protocol that synthesizes multidimensional scores from on‑chain and off‑chain activity.

**Mathematical foundation:**
- **Asymmetric decay** – positive events decay at `λ_pos = 0.001` per day, negative events at `λ_neg = 0.003` (3× faster).
- **Shannon entropy analysis** – detects bot‑like activity patterns.
- **Merkle proofs** – each score is anchored on Vara Network and verifiable independently.

**Dimensions:**
- Technical (code, audits)
- Governance (voting quality, proposals)
- Reliability (delivery on commitments)
- Community (mentorship, conflict resolution)

**Anomaly detection:** temporal, semantic, network, and quality analysis → `behavioral confidence` factor (0–1) that modulates contribution weight.

---

### Scorecard – The Canonical Specification Format

A **JSON schema** that forces the explicit definition of:

1. **Problem** – current state, desired state, evidence, prior attempts.
2. **Boundaries** – scope, dependencies, constraints, exclusions.
3. **Technical specification** – architecture, requirements, success criteria.
4. **Effort** – time, human resources, financial costs, identified risks.

The **Invariant Engine** validates each Scorecard against 7 categories of rules (existence, scope, time, feasibility, proof, consistency, duplication). Output: `VALID / INVALID` with specific error codes (IFC).

---

### Atlas Engine – Real‑time Data Ingestion

Atlas continuously ingests data from:

| Source | Type | Data extracted |
|--------|------|----------------|
| Snapshot / Tally | Governance | Proposals, votes, outcomes |
| GitHub | Code | Commits, PRs, issues, reviews |
| Rootstock / Arbitrum / Optimism | L2 chains | Transactions, contract deployments |
| The Graph | Indexing | Subgraph queries for DAO metrics |
| EAS / Gitcoin Passport | Attestations | Credentials, stamps |

All raw data is normalized into a unified **knowledge graph** (Neo4j) with disambiguated identities.

---

### Sincerity API – Portable Credentials

Generate **verifiable credentials** (W3C VC format) that can be embedded into LinkedIn, Upwork, or any professional platform.

- Each credential includes a **Merkle proof** linking to the immutable AVIP score.
- Verification requires only the root hash (anchored on Vara/Ethereum) – no live API call needed.
- Supports selective disclosure (e.g., prove only technical score without revealing entire history).

---

## 🔗 Algorand Integration: X402 & Validator Rewards

Andromeda Core deeply integrates with the **Algorand ecosystem** through:

- **X402 Protocol** – A lightweight off‑chain payment channel that enables micropayments for reputation verifications. Validators earn **ALGO** each time they attest a milestone or resolve a dispute.
- **Reward Processor** – An automated smart contract on Algorand that distributes rewards proportionally to validator stake and participation. The distribution uses a **verifiable random function (VRF)** to select attestation committees.
- **State Bridge** – Bi‑directional synchronization between Algorand (for reward accounting) and Vara Network (for immutable proof storage). AVIP scores are hashed and periodically checkpointed on Algorand to enable light‑client verification.

> 📄 **Flows & Diagrams**  
> - [Payment & Reward Flow](https://dev.andromedacomputer.net/andromeda-payment-flow.html)  
> - [Slashing Flow](https://dev.andromedacomputer.net/andromeda-slashing-flow.html)  
> - [AVIP Reward Flow for Validators](https://dev.andromedacomputer.net/andromeda-avip-reward-flow.html)

---

## 🧱 System Architecture

<p align="center">
  <img src="https://dev.andromedacomputer.net/andromeda-system-architecture.html" alt="System Architecture" width="90%"/>
</p>

The platform is organized into four layers:

| Layer | Components | Technologies |
|-------|------------|--------------|
| **Ingestion** | Connectors for Snapshot, GitHub, L2s, The Graph, EAS | BullMQ, Redis, GraphQL clients |
| **Processing** | Normalization, identity resolution, classification, anomaly detection | TypeScript, TensorFlow.js, custom ML models |
| **Storage** | Immutable proofs, knowledge graph, event logs | IPFS (Pinata), Neo4j, PostgreSQL (Supabase), MongoDB |
| **Exposure** | GraphQL API, web dashboard, oracles, VCs | Next.js API routes, GraphQL Yoga, NextAuth |

**Immutability guarantees:**
- Every Scorecard, attestation, and slashing event is hashed and stored in a **Merkle Mountain Range (MMR)**.
- Roots are periodically anchored on **Vara Network** (for fast finality) and **Ethereum** (for long‑term settlement).

---

## 📊 Comparison with Existing Solutions

<table>
<thead>
<tr>
<th>Feature</th>
<th>Andromeda Core (AVIP)</th>
<th>Gitcoin Passport</th>
<th>EAS (Ethereum Attestation)</th>
<th>Proof of Humanity</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>Immutability</strong></td>
<td>✅ Immutable (MMR + Vara)</td>
<td>❌ Revocable stamps</td>
<td>❌ Revocable attestations</td>
<td>❌ Challenge period</td>
</tr>
<tr>
<td><strong>Portability</strong></td>
<td>✅ Cross‑chain (Vara, Ethereum, Algorand)</td>
<td>❌ Limited to Gitcoin</td>
<td>✅ On‑chain but not portable</td>
<td>❌ Single registry</td>
</tr>
<tr>
<td><strong>Sybil resistance</strong></td>
<td>✅ Entropy + behavioral analysis</td>
<td>❌ Basic stamp aggregation</td>
<td>❌ None</td>
<td>✅ Video + deposit</td>
</tr>
<tr>
<td><strong>Quality scoring</strong></td>
<td>✅ Multidimensional (tech, gov, reliability)</td>
<td>❌ Only humanhood</td>
<td>❌ Arbitrary strings</td>
<td>❌ Only humanhood</td>
</tr>
<tr>
<td><strong>Incentives</strong></td>
<td>✅ X402 micropayments for validators</td>
<td>❌ None</td>
<td>❌ None</td>
<td>❌ None</td>
</tr>
<tr>
<td><strong>Anomaly detection</strong></td>
<td>✅ ML + graph analysis</td>
<td>❌ No</td>
<td>❌ No</td>
<td>❌ No</td>
</tr>
</tbody>
</table>

---

## 📁 Project Structure

andromeda-core-platform/
├── src/
│ ├── app/
│ │ ├── [locale]/ # i18n pages (es, en, pt)
│ │ ├── api/ # Next.js API routes
│ │ │ ├── coordination/ # Scorecard validation/publishing
│ │ │ ├── intelligence/ # Telemetry, sync, activity logs
│ │ │ ├── reputation/ # AVIP scores, attestations
│ │ │ └── rootstock/ # Governance data proxy
│ │ └── layout.tsx
│ ├── components/
│ │ ├── coordination/ # ScorecardForm, RegistryView, AtlasExplore
│ │ ├── intelligence/ # SyncManager, SystemMetrics, NetworkGraph
│ │ ├── layout/ # DashboardUnified, Sidebar
│ │ └── ui/ # Panel, LED, button components
│ ├── lib/
│ │ ├── services/reputation/ # ReputationEngine (AVIP)
│ │ ├── invariants/ # Scorecard invariant validator
│ │ ├── anomaly/ # Temporal, semantic, network detectors
│ │ └── utils/ # Logger, Merkle proof helpers
│ ├── hooks/ # useAndromedaWallet, useScorecards, etc.
│ ├── i18n/ # next-intl config
│ └── locales/ # JSON translation files
├── public/ # Static assets (logo, favicon)
├── scripts/ # Sync workers, test scripts
├── tests/ # Unit, stress, chaos tests
├── package.json
└── README.md



---

## 🚀 Installation & Setup

### Prerequisites

- Node.js 20+ (LTS recommended)
- npm or pnpm
- Pinata account (IPFS) – [https://pinata.cloud](https://pinata.cloud)
- Upstash Redis account – [https://upstash.com](https://upstash.com)
- Supabase account (PostgreSQL) – [https://supabase.com](https://supabase.com)
- Algorand node or indexer (optional, for X402)

### Clone & Install

```bash
git clone https://github.com/AndromedaCore/AlgorandX402.git
cd AlgorandX402
npm install


Environment Variables
Create a .env.local file in the root with the following keys:

# Supabase (PostgreSQL)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Pinata (IPFS)
PINATA_JWT=your-jwt
NEXT_PUBLIC_PINATA_GATEWAY=https://gateway.pinata.cloud

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://your-region.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# Algorand (X402)
ALGORAND_INDEXER_TOKEN=your-token
ALGORAND_INDEXER_URL=https://mainnet-idx.algonode.cloud

# Vara Network (Gear)
NEXT_PUBLIC_VARA_RPC=wss://rpc.vara.network

# Optional: Ethereum RPC for anchoring
NEXT_PUBLIC_ETH_RPC=https://mainnet.infura.io/v3/your-key

Run Development Server
npm run dev


Open http://localhost:3000 – you will see the industrial‑style landing page.

Build for Production

npm run build
npm start

📡 API Endpoints
All endpoints return JSON. Most require an API key (free tier available).

Method	Endpoint	Description
POST	/api/coordination/validate	Validate a Scorecard (invariant engine)
POST	/api/coordination/publish	Publish Scorecard → IPFS → Vara anchor
GET	/api/intelligence/telemetry	Real‑time system metrics & data source status
GET	/api/intelligence/activity	Recent activity log (events, syncs)
GET	/api/reputation/verify/:did	AVIP score for a builder (requires API key)
POST	/api/reputation/attest	Peer attestation (reputation staking)
GET	/api/rootstock/proposals	Recent on‑chain proposals (Rootstock)
GET	/api/docs	Swagger UI for full API reference


Example request (AVIP score):

curl -X GET "https://core.andromedacomputer.net/api/reputation/verify/did:example:0x123" \
  -H "x-api-key: ac_your_key"

🗺️ Roadmap & Governance
Andromeda Core is a public good – no native token, governed by the community through two bodies:

Assembly of Builders – weighted by reputation (not tokens). Decides funding, strategy.

Invariants Parliament – elected technical committee. Approves algorithm changes.

<details> <summary><b>Progressive decentralization roadmap</b> (click to expand)</summary>
Phase	Target	Status
Phase 1 (Foundation)	Centralized infra, team‑led	✅ Complete
Phase 2 (Co‑governance)	Assembly of Builders operational	🟡 Q2 2026
Phase 3 (Distributed pinning)	Community IPFS nodes	🟡 Q3 2026
Phase 4 (Full DAO)	No special team privileges	🔲 Q4 2026
</details>
🤝 Contributing
We welcome contributions! Please read the Contribution Guidelines (to be added). Areas where help is needed:

New data source connectors (Cosmos, Solana, etc.)

Machine learning models for anomaly detection

Security audits and invariants formalization

Documentation translations (zh, ja, ko)

Bug bounty: Security vulnerabilities can be reported to security@andromedacomputer.net – rewards up to $5,000 in stablecoins.

📄 License
MIT © 2026 Andromeda Computer.
This project is public good infrastructure – freely usable, forkable, and auditable.

🔗 References & External Links
Andromeda Core Paper v3.1 (PDF)

System Architecture Diagram

X402 Payment & Reward Flow

Slashing Flow

AVIP Reward Flow

Live Dashboard (demo)

<p align="center"> Made with <strong>clarity</strong>, <strong>immutability</strong>, and <strong>hard industrial design</strong>. </p> ```



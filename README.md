# Andromeda Core – Solana Frontier Hackathon 🚀

[![Hackathon](https://img.shields.io/badge/Hackathon-Colosseum--Frontier-14F195?style=for-the-badge&logo=solana)](https://colosseum.org/frontier)
[![RPC](https://img.shields.io/badge/RPC-RPC%20Fast%20(gRPC)-6D28D9?style=for-the-badge)](https://rpcfast.com/)
[![Status](https://img.shields.io/badge/Status-Active%20Development-blue?style=for-the-badge)]()

**Andromeda Core** is a **Verifiable Reputation Protocol** for the Agentic Economy. We provide a decentralized trust layer for builders, DAOs, and autonomous agents. During the **Colosseum Frontier Hackathon**, we are establishing **Solana** as our primary high‑performance infrastructure for identity, governance indexing, and immutable record anchoring.

> 💡 **Vision:** Every Solana builder and AI agent will have a **TrustScore** – backed by on‑chain history, secured by Solana’s speed, and powered by **RPC Fast’s Yellowstone gRPC**.

---

## ⚡ Why RPC Fast is Critical for Our Reputation Engine

Traditional JSON‑RPC polling cannot keep up with real‑time reputation scoring. With **RPC Fast’s Yellowstone gRPC (Geyser)** we achieve:

- **Real‑time Governance Indexing** – Subscribe to account changes of Realms/Squads, eliminating polling latency.
- **Sub‑second TrustScore Updates** – Every vote or proposal creation triggers an immediate update of a builder’s reputation.
- **Horizontal Scalability** – The gRPC stream can handle thousands of concurrent subscriptions, allowing our **AVIP engine** to process massive volumes of on‑chain activity without bottlenecks.
- **Low‑Cost Anchoring** – Fast, reliable RPC means our **Atlas** registry can confirm milestone submissions in seconds, enabling a smooth user experience.

> **RPC Fast is the backbone of our scalability strategy.** Without it, we cannot deliver real‑time reputation for the Solana ecosystem.


The project already features a functional Solana client (solana-client.ts) and a batch adapter (solana-adapter.ts) that anchors scorecards using the Solana Memo program. The audit system (/es/audit) already displays the status of this connection. For the hackathon, we need to add:

Real-time governance (gRPC connector for Realms/Squads).

A custom Anchor contract (to record reputation milestones, replacing the simple Memo).
---

## ✅ Already Built (Pre‑Hackathon)

| Component | Status | Description |
|-----------|--------|-------------|
| **Solana DID** | ✅ Complete | `did:andromeda:sol:<pubkey>` fully integrated into AVIP. |
| **Ed25519 Signature Verification** | ✅ Complete | Wallets (Phantom/Solflare) can sign and publish Scorecards. |
| **AVIP Reputation Engine** | ✅ Complete | Shannon entropy + asymmetric decay ready to consume Solana data. |
| **Health Endpoint** | ✅ Complete | `/api/solana/health` monitors RPC connectivity. |
| **Rootstock / Algorand / Optimism / Arbitrum** | ✅ Complete | Governance data already ingested from multiple chains. |

---

## 🧱 Hackathon Sprint – Building a Scalable Reputation Layer on Solana

We will deliver **four tightly integrated components** that transform Solana into our primary reputation settlement layer.

### 1. Governance Indexer using Yellowstone gRPC
- **What:** A `solana-connector.ts` that subscribes to **Realms** and **Squads** accounts via RPC Fast’s gRPC.
- **How it scales:** Real‑time streams → AVIP engine updates TrustScores immediately → no polling delays.
- **Deliverable:** Index proposals, votes, and delegate participation from at least 2 major Solana DAOs (e.g., Mango, PsyFinance).

### 2. AndromedaRegistry (Anchor Smart Contract)
- **What:** A Rust/Anchor contract deployed on **Solana devnet** that permanently anchors verified milestones (Merkle roots + IPFS CIDs).
- **Why Solana:** Finality in seconds, low cost, and high throughput – ideal for immutable reputation storage.
- **Deliverable:** The contract will become the **canonical source of truth** for all TrustScores.

### 3. Native SOL Micro‑Rewards (x402 for Solana)
- **What:** Automated micropayments in **SOL** to validators who verify milestones.
- **Leverages:** Solana’s near‑zero fees and RPC Fast’s low‑latency confirmation.
- **Deliverable:** A reward system integrated into the Atlas workflow.

### 4. Solana TrustScore API & Dashboard
- **What:** Public endpoints (`/api/reputation/score/[did]`) and a frontend dashboard to visualise builder reputation.
- **Data source:** Real‑time governance activity streamed via gRPC.
- **Deliverable:** A live dashboard that shows TrustScores updating as new votes are cast.

---

## 📊 Comparison with Existing Solutions

| Feature | Andromeda Core (AVIP) | Gitcoin Passport | Ethereum Attestation Service (EAS) |
| :--- | :--- | :--- | :--- |
| **Immutability** | ✅ Immutable (MMR + Solana anchor) | ❌ Revocable stamps | ❌ Revocable |
| **Portability** | ✅ Solana, Algorand, EVM, Rootstock | ❌ Gitcoin only | ❌ On‑chain fixed |
| **Sybil Resistance** | ✅ Shannon entropy + graph analysis | ❌ Basic aggregation | ❌ None |
| **Quality Scoring** | ✅ Multidimensional (tech, governance, community) | ❌ Humanhood only | ❌ Plain text |

---

## 🛠️ Technology Stack

- **Blockchain:** Solana (Anchor, Rust, `@solana/web3.js`), Algorand (x402), EVM (EIP‑712)
- **Infrastructure:** **RPC Fast (Yellowstone gRPC)**, MongoDB Atlas, IPFS (Pinata), Upstash Redis
- **Backend:** Next.js 16 (App Router), TypeScript, BullMQ, Zod
- **Reputation Engine:** AVIP (Shannon entropy, asymmetric decay, anomaly detection)
- **Frontend:** React 19, Tailwind CSS, Radix UI, Framer Motion
- **Testing:** Jest, tsx (stress/chaos tests)

---
```
## 📁 Project Structure
andromeda-core-platform/
├── src/
│ ├── app/ # Next.js App Router (API routes, i18n pages)
│ ├── components/ # Industrial‑style UI components
│ ├── lib/
│ │ ├── infrastructure/ # Clients (Algorand, Solana, Vara)
│ │ ├── services/ # AVIP engine, connectors (Rootstock, Solana, etc.)
│ │ └── coordination/ # Invariants, registry, Atlas orchestrator
│ ├── hooks/ # useWallet, useScorecards
│ └── types/ # Scorecard, DID parsers
├── scripts/ # Sync workers, recalculate AVIP
├── packages/ # Smart contracts (AVIP, Algorand, Solana)
└── tests/ # Unit, stress, and chaos tests
```



## 🧪 How to Run Locally (for Judges)

> These instructions assume you want to test the **Solana integration** and the core reputation engine.

### Prerequisites
- Node.js 20+ and npm
- A Solana wallet (Phantom) for testing signatures (devnet)
- (Optional) Algorand LocalNet for x402 payments

```

### Setup


Environment Variables
Create a .env.local file from .env.example and set at least:

```
git clone https://github.com/AndromedaCore/Core-Solana.git
cd Core-Solana
npm install
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SOLANA_RPC_URL=https://api.devnet.solana.com
# For RPC Fast users:
# SOLANA_RPC_URL=https://<your-grpc-endpoint>.rpcfast.com

```

Run the Development Server

```
npm run dev
```

Open http://localhost:4000/en/coordination – you can now:

Connect a Solana wallet (Phantom) – the Ed25519 signature will be verified.

Fill a test Scorecard and publish it (the backend will validate invariants, upload to IPFS, and store in Supabase).
```
```
Check the health endpoint: http://localhost:4000/api/solana/health

Run Tests
```
npm test                # unit tests
npm run test:stress     # load testing
npm run test:chaos      # chaos engineering
```

Build for Production
```
npm run build
npm start
```
```
📡 API Endpoints (Public)
Method	Endpoint	Description
POST	/api/coordination/publish	Publish a signed Scorecard (supports Solana Ed25519 & EVM EIP‑712)
GET	/api/reputation/score/[did]	Retrieve a builder’s TrustScore (requires API key for enterprise)
GET	/api/solana/health	Check Solana RPC connectivity and feature support
GET	/api/atlas/search?q=...	Search milestones (builders, projects)
GET	/api/rootstock/builders	List builders from Rootstock (example cross‑chain connector)
Full Swagger documentation is available at /docs when running locally.
```
```
 Success Metrics for Colosseum
Metric	Target
Real‑time ingestion	Index proposals from ≥2 major Solana DAOs (e.g., Mango, PsyFinance)
On‑chain finality	≥100 immutable milestones anchored on the AndromedaRegistry contract (devnet)
Latency	TrustScore update ≤2 seconds after a vote is cast (measured via gRPC stream)


 Roadmap & Governance
Andromeda Core is a public good governed by the Assembly of Builders (reputation‑weighted) and the Invariants Parliament (technical committee).
```
```
Phase	Status
Phase 1 – Foundation (Scorecard + AVIP + Atlas)	✅ Complete
Phase 2 – Co‑governance (Assembly active)	🟡 Q2 2026
Phase 3 – Distributed pinning (IPFS community nodes)	🟡 Q3 2026
Phase 4 – Full DAO (No privileged team keys)	🔲 Q4 2026
```
```
🤝 Contributing
Contributions are welcome! We need help with:

New blockchain connectors (Solana governance, NEAR, ICP)

ML models for anomaly detection

Translations and documentation

Security audits

Report vulnerabilities to security@andromedacomputer.net.

📄 License
MIT © 2026 Andromeda Computer. Public good infrastructure.

<p align="center">Made with <strong>clarity</strong>, <strong>immutability</strong>, and <strong>hard industrial design</strong>.</p> ```

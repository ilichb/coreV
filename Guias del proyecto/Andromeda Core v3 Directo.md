# Andromeda Core v3.1 – Technical Specification (Condensed)

## 1\. Problem Statement

Current Web3 coordination suffers from:

* Ambiguous proposals – lack of verifiable specifications, leading to misallocated funds  
* Fragmented reputation – each DAO/protocol has isolated reputation systems, enabling Sybil attacks and whitewashing  
* Non‑portable trust – no standard to compare contributors across ecosystems

Andromeda Core provides an infrastructure for structural clarity and verifiable portable reputation.  
---

## 2\. Foundational Axioms

1. Format as product – rigid schemas force explicit intent.  
2. Strict separation of responsibilities:  
   * Communities → define why (strategic intent, problem prioritisation)  
   * Andromeda   → define what (structured specification, no evaluation of merit)  
   * Builders         → define how (execution against spec)  
3. Radical transparency – all artefacts, validations, rejections are public.  
4. Immutability by design – once recorded, facts never change (append‑only via Merkle trees anchored on L1).  
5. Limited capacity over artificial scale – correctness before throughput.

---

## 3\. Core Artefact: The Scorecard

A JSON structure with four mandatory dimensions:

| Dimension | Required fields |
| :---- | :---- |
| Problem | current state, desired state, evidence of gap, previous attempts |
| Limits | scope, critical dependencies, operational constraints, exclusion criteria |
| Technical specification | architecture, implementation requirements, verifiable success criteria, validation mechanisms |
| Effort | time (phases/milestones), human resources, financial breakdown, identified risks |

The Scorecard is canonical – each field has binding semantics (used later for reputation calculation).  
---

## 4\. Invariant Engine (Validation)

Seven categories of invariants, applied deterministically:

1. Existence – all mandatory fields present, non‑null, references exist.  
2. Scope – size limits, reference counts, supported language.  
3. Time – start date not before submission, positive duration, ordered milestones.  
4. Feasibility – gross consistency between problem complexity and estimated effort.  
5. Proof – valid hashes, signatures, on‑chain references.  
6. Consistency – success criteria align with problem definition; spec respects limits; effort matches complexity.  
7. Duplication – semantic similarity with past proposals (plagiarism detection).

Output: valid / invalid \+ Invariant Failure Code (IFC) pinpointing violation.  
---

## 5\. Data Ingestion & Knowledge Graph

Andromeda does not wait for voluntary submissions – it ingests existing public data via connectors:

* Governance – Snapshot, Tally, Agora (proposals, votes, outcomes)  
* Code – GitHub (commits, PRs, issues, reviews)  
* On‑chain – Ethereum, Polygon, Arbitrum, Optimism, Vara (transactions, contract deployments)  
* Credentials – Gitcoin Passport, EAS, Proof of Humanity  
* Discussions – forums, Discord (NLP‑extracted intent)

Normalisation & identity resolution:

* Each event → canonical structure with unique ID, type, timestamp, proofs.  
* Identity resolution is probabilistic (not binary) – maintains a confidence factor for unifying different identifiers (wallets, GitHub, Twitter).

Classification:

* Contribution type (code, audit, governance, community, research)  
* Domain (DeFi, NFT, infra, privacy, etc.)  
* Magnitude and quality (complexity, adoption, peer attestations)

Knowledge graph – nodes (builders, projects, organisations, proposals, contributions, problems, solutions) and edges (authorship, membership, dependency, similarity, attestation). All edges have temporal range, proofs, confidence scores.  
---

## 

## 6\. AVIP – Reputation Protocol

AVIP produces verifiable, portable, manipulation‑resistant reputation.

### 6.1 Multidimensional reputation

Five dimensions (weights configurable per context):

* Technical (D\_tec) – code volume, complexity, quality, impact (forks, dependencies), peer attestations.  
* Governance (D\_gov) – proposal frequency, vote consistency, success rate, debate quality.  
* Community (D\_com) – mentorship, documentation, conflict resolution, peer ratings.  
* Reliability (D\_conf) – on‑time milestone delivery, dispute history, counterparty attestations.  
* Innovation (D\_inn) – novelty, adoption of ideas, long‑term impact.

### 6.2 Decay and aggregation

For a dimension D at time \*t\*:  
text  
D(t) \= Σ w\_i · e^{-λ\_D · Δt\_i} · c\_i

* w\_i – base weight of event \*i\* (type \+ impact)  
* λ\_D – dimension‑specific decay rate (positive events decay slower)  
* Δt\_i – time elapsed since event  
* c\_i – confidence factor (1 for on‑chain, \<1 for inferred)

Asymmetric decay:  
λ\_pos \= 0.001 (per day)  
λ\_neg \= 0.003 (per day)  
→ negative events fade 3× faster.

### 6.3 Behavioral confidence factor (C\_behavioral)

Combines four anomaly detection signals into a score in \[0,1\]:

* Temporal – entropy of inter‑event intervals, autocorrelation, diurnal patterns. Human threshold \~3.8 bits.  
* Semantic – code complexity, comment density, textual depth, coherence, originality.  
* Network – centrality, community isolation, reciprocal attestation patterns, homophily.  
* Quality/impact ratio – impact per unit volume.

If C\_behavioral is low, effective contribution weight is reduced:  
text  
w\_effective \= w\_base · C\_behavioral²  
No binary bot/human classification – gradual penalty.

### 6.4 Attestations

Builders can attest each other’s contributions. Attestations require stake (reputational or token) and can be slashed if proven false. Weight of an attestation depends on:

* Attester’s reputation  
* Consistency with other attestations  
* Specificity (linked to a concrete contribution)  
* Recency

Negative attestations trigger a dispute process – final appeal to a randomly selected jury (VRF).

### 6.5 Slashing

Penalties for malicious behaviour (fake attestations, Sybil attacks, collusion):

* Base penalty scaled by fault severity (1‑5)  
* Recidivism multiplier – P \= P\_base · (1+α)^(n-1) with α=0.5  
* Reduction in all reputation dimensions (decays over time but stays in history)

### 6.6 TrustScore (contextual)

For a context \*c\* (e.g., technical hiring, governance role):  
text  
T\_c \= Σ w\_{c,d} · D\_d  
w\_{c,d} can be:

* Explicitly set by the consumer  
* Learned from historical success data  
* Ad‑hoc in query

Interpretation: estimated probability of reliable performance in that context.

### 6.7 Portability & verifiability

Any TrustScore is accompanied by a Merkle proof linking it to a root anchored on L1 (Ethereum / Vara). Anyone can verify without trusting Andromeda’s API.  
---

## 7\. System Architecture (Implemented)

Layers:

1. Ingestion – workers (BullMQ) polling sources; raw data stored on IPFS.  
2. Processing – normalisation → identity resolution → classification → graph construction (Neo4j).  
3. Storage – IPFS (content), PostgreSQL (metadata), Neo4j (graph), MMR (snapshots anchored on L1).  
4. Exposure – GraphQL API, dashboard, oracle interface, Sincerity API (credentials for Web2 platforms).

Progressive decentralisation roadmap:

* Q4 2026 – distributed IPFS pinning network (community nodes)  
* Q2 2027 – decentralised RPC aggregator  
* Q4 2027 – community read replicas of graph  
* Q2 2028 – fully distributed data infrastructure

---

## 8\. Governance (No Native Token)

* Assembly of Builders – open to anyone with TrustScore \> 30 (or configurable threshold). Voting power \= TrustScore\_context · (1 \+ log(1+participation)). Decides strategic and budget issues.  
* Parliament of Invariants – 12 members elected by Assembly for 2‑year terms (max 2 consecutive). Decides technical changes (algorithms, parameters). Decisions can be appealed to Assembly.  
* Juries by sortition – 7 members randomly selected via VRF from builders with TrustScore \> 60\. Resolves disputes (attestation challenges, anomaly classification appeals). Second instance possible.  
* Constitutional firewalls – immutable principles (no deletion of historical records, calculations must be reproducible, reputation cannot be confiscated without due process, system neutrality, free tier must remain). Changing requires 75% supermajority \+ 6‑month cooling \+ external ratification.

---

## 9\. Sustainability Model

No token. Funding sources:

* API usage fees – free tier (10k queries/month), paid tiers for commercial consumers (ETH/USDC/fiat).  
* Value‑added services – custom analytics, alerts, advanced verification, assisted integrations.  
* Grants / sponsorships – from foundations (Ethereum, Uniswap, Aave, Optimism) and large DAOs.  
* Donations – from philanthropists.

Andromeda Foundation (non‑profit) manages funds. Sustainability Trust holds reserves (≥3 years operating expenses). Surplus invested in low‑risk assets. All financial transactions recorded immutably on the graph. Annual external audits \+ community finance committee.  
---

## 10\. Sincerity API (Bridge to Web2)

Generates verifiable credentials for platforms like LinkedIn.  
Credential contains:

* Subject (DID \+ optional platform identity)  
* Atomic claim (e.g., "TrustScore technical \= 92", "contributed to project X")  
* Merkle proof linking claim to latest snapshot root  
* Andromeda signature

Verification does not require calling Andromeda – any verifier can check the Merkle proof against the on‑chain root.  
---

## 11\. Anomaly Detection (Immunology System)

Multimodal, probabilistic:

* Temporal – entropy of intervals, autocorrelation, Fourier periodicities.  
* Semantic – code complexity, comment density, NLP coherence.  
* Network – centrality, community isolation, reciprocity.  
* Quality/impact – ratio of impact to volume.

All signals feed into a learned model that outputs C\_behavioral (0‑1). Low C\_behavioral reduces contribution weight (w\_effective \= w\_base · C\_behavioral²). No binary bot label.  
If a builder disputes a low C\_behavioral, they can request a jury review (see section 8 – juries).  
---

## 12\. Key Mathematical Constants (Production)

| Constant | Value |
| :---- | :---- |
| λ\_pos (positive decay) | 0.001 per day |
| λ\_neg (negative decay) | 0.003 per day |
| Shannon entropy threshold (anomaly) | 3.8 bits |
| Minimum confidence | 0.1 (never silence completely) |
| Recidivism scaling α | 0.5 |
| C\_behavioral exponent γ | 2.0 |
| Jury size | 7 |
| Parliament size | 12 |

---

## 13\. Current System State (as of March 2026\)

* Builders identified: 52,847  
* Projects mapped: 5,234  
* Events processed: 18.3 million  
* Pilot integrations: 12 DAOs, 3 investment funds  
* Chains covered: Ethereum, Polygon, Arbitrum, Optimism, Vara (Solana, Cosmos in development)  
* Code: Open source, repository at \[provided URL\]  
* No token, no private investors

---

## 14\. Developer Quick Reference

Core services (see implementation files in andromeda-core/):

* reputation-engine.service.ts – implements formulas from section 6\.  
* builder-ingestion.service.ts – ingests Rootstock builders, computes AVIP score, stores avipScore in milestone metadata.  
* avip-viem-adapter.ts – hardened adapter with Zod validation, idempotency, DLQ, retries, batch submission (default size 10). Uses AVIP\_ENABLED env var.  
* rootstock-connector.ts – The Graph queries with THEGRAPH\_API\_KEY env var. Uses correct fields: votesFor, votesAgainst, rawState (0‑7 mapping).  
* redis.ts – in‑memory fallback if Redis unavailable.

Environment variables (critical):  
text  
MONGODB\_URI  
NEXT\_PUBLIC\_SUPABASE\_URL  
NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY  
THEGRAPH\_API\_KEY  
AVIP\_ENABLED (true/false)  
AVIP\_CONTRACT\_ADDRESS  
PINATA\_JWT  
VARA\_NETWORK (testnet/mainnet)  
Build & test commands:  
bash  
npm run dev          \# starts on port 4002 (or 3000\)  
npm run test:sync    \# sync Rootstock builders  
node scripts/sync-ecosystems.js   \# sync Optimism, Arbitrum, Algorand  
npm run build        \# production build  
curl http://localhost:4002/api/health  
Missing files (must be present in repo):

* src/lib/infrastructure/redis.ts  
* src/lib/services/reputation/reputation-engine.service.ts  
* src/lib/services/security/secret-manager.service.ts

---


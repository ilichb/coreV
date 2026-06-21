# FES Pilot — Informe de Cierre Semana 1

## 1. Arquitectura implementada

```
                  ┌──────────────────────────────────────────┐
                  │           FES PILOT v1 (MVP)              │
                  ├──────────────────────────────────────────┤
                  │                                          │
  REWARDS ───────►│  InactiveHolderService                    │
  SUBGRAPH        │   ├─ fetchAllBackers() (paginado)         │
                  │   ├─ batchBlockToDate() (RPC batching)    │
                  │   └─ batchGetRIFBalances() (RPC batching) │
                  │                                          │
                  │  CohortAssignmentService                  │
                  │   ├─ Whale filter (>1M RIF → VIP)        │
                  │   ├─ Days-inactive stratification         │
                  │   └─ Pair-based alternating A/B           │
                  │                                          │
                  │  Message Templates                        │
                  │   ├─ control (A) — informativo sin CTA    │
                  │   ├─ treatment (B) — re-engagement con CTA│
                  │   └─ vip — personalizado para whales      │
                  │                                          │
                  │  ReactivationTrackerService                │
                  │   ├─ checkOne(wallet)                     │
                  │   └─ checkAll()                           │
                  │   └─ Reactivation: block >= checkpoint+10 │
                  │                                          │
                  │  FESStorageService                        │
                  │   ├─ fes_participants (Supabase)          │
                  │   └─ fes_events (Supabase)                │
                  │                                          │
                  │  UI: /preview (dashboard)                 │
                  └──────────────────────────────────────────┘
```

## 2. Endpoints creados

| Endpoint | Método | Descripción | Archivo |
|---|---|---|---|
| GET `/api/rootstock/inactive-holders` | GET | Detecta holders inactivos. Query param `?address=` para uno solo | `src/app/api/rootstock/inactive-holders/route.ts` |
| GET `/api/fes/metrics` | GET | Reporte completo: detección, cohortes, mensajes, reactivación | `src/app/api/fes/metrics/route.ts` |
| POST `/api/fes/track` | POST | Ejecuta ciclo de verificación de reactivación. Body `{"wallet":"0x..."}` opcional | `src/app/api/fes/track/route.ts` |
| GET `/api/fes/participants` | GET | Lista participantes con estado. Query params: `?cohort=A&reactivated=true` | `src/app/api/fes/participants/route.ts` |
| GET `/preview` | HTML | Dashboard visual de todo el piloto | `src/app/preview/page.tsx` |

## 3. Servicios creados

| Servicio | Archivo | Líneas | Responsabilidad |
|---|---|---|---|
| `InactiveHolderService` | `src/lib/services/rootstock/inactive-holder.service.ts` | 429 | Query subgraph + RPC, detección de inactividad |
| `CohortAssignmentService` | `src/lib/services/rootstock/cohort-assignment.service.ts` | 95 | Segmentación A/B/VIP, estratificación por días |
| `FESStorageService` | `src/lib/services/rootstock/fes-storage.service.ts` | 195 | CRUD Supabase para participantes y eventos |
| `ReactivationTrackerService` | `src/lib/services/rootstock/reactivation-tracker.service.ts` | 135 | Polling subgraph, detección de reactivación |
| Message templates | `src/lib/services/rootstock/message-templates.ts` | 108 | 3 variantes × 2 idiomas |

## 4. Esquema de datos (Supabase)

### `fes_participants`
```sql
wallet              VARCHAR(42) PK     -- Address checksum
cohort              VARCHAR(5)         -- 'A' | 'B' | 'VIP'
message_variant     VARCHAR(10)        -- 'control' | 'treatment' | 'vip'
balance_at_detection NUMERIC           -- RIF balance snapshot
days_inactive_at_detection INTEGER     -- Días de inactividad
last_block_at_detection NUMERIC        -- Block al detection
last_block_checkpoint NUMERIC          -- Block al envío del mensaje
message_sent_at     TIMESTAMPTZ        -- Cuándo se envió
message_language    VARCHAR(2)         -- 'en' | 'es'
reactivated         BOOLEAN DEFAULT FALSE
reactivated_at      TIMESTAMPTZ        -- Cuándo reactivó
last_block_current  NUMERIC            -- Último block verificado
last_checked_at     TIMESTAMPTZ
created_at / updated_at TIMESTAMPTZ    -- Timestamps
```

### `fes_events`
```sql
id          UUID PK          -- Auto
wallet      VARCHAR(42)      -- Address (indexado)
event_type  VARCHAR(30)      -- detected | assigned | message_sent | status_check | reactivated
payload     JSONB            -- Datos del evento
created_at  TIMESTAMPTZ      -- Auto (indexado DESC)
```

## 5. Resultados obtenidos

### Detección (Rewards Subgraph + RSK RPC)
| Métrica | Valor |
|---|---|
| Universo de backers escaneados | 289 |
| Stakers con accumulatedTime > 0 | 289 |
| Superan filtro de fecha (>30d, pre-2026-06-01) | 228 |
| Balance RIF en wallet > 500 RIF | **21 holders inactivos** |
| Tiempo de ejecución | ~13s (batching 20 RPC calls) |

### Segmentación
| Métrica | Valor |
|---|---|
| Whales excluidos (>1M RIF) | **1 wallet** — `0xac31a4...` (9,351,254 RIF, 481d inactivo) |
| Cohort A (Control) | **10 wallets** — avg 217.1d inactivos |
| Cohort B (Treatment) | **10 wallets** — avg 218.0d inactivos |
| Desviación días inactivos (A vs B) | **+0.41%** ✅ (<5% target) |
| Balance promedio A | 14,760 RIF |
| Balance promedio B | 41,851 RIF |
| Asignación determinística | ✅ PASS |
| Sin wallets duplicadas | ✅ PASS |

### Mensajes generados
| Variante | Total | Audiencia |
|---|---|---|
| Control (A) | 10 | Cohort A |
| Treatment (B) | 10 | Cohort B |
| VIP | 1 | Whale (9.35M RIF) |

### Tracking (Pendiente de datos reales)
| Canal | Estado |
|---|---|
| Supabase tables | Pendiente crear (SQL en `supabase/migrations/001_create_fes_tables.sql`) |
| POST `/api/fes/track` | Implementado, esperando DB |
| GET `/api/fes/participants` | Implementado, esperando DB |
| Cron diario | No implementado (Semana 2) |

## 6. Riesgos conocidos

| ID | Riesgo | Severidad | Mitigación | Plan |
|---|---|---|---|---|
| L1 | Solo detecta stakers — pure RIF holders invisibles | Alta | RIF Transfer events via eth_getLogs | Semana 2 |
| L2 | lastBlockNumber no captura governance/votes | Media | Governance Subgraph | Semana 2 |
| L3 | Subgraph latency → falsos positivos en detección | Media | Buffer de 100 bloques + reintentos | Implementado |
| L4 | RPC rate limits en RSK public node | Media | Batching (20), Redis cache, RPC Balancer | Implementado |
| D1 | Reactivación requiere +10 bloques | Baja | Buffer mínimo para estabilidad | Implementado |
| D2 | 21 wallets = muestra pequeña | Alta | Agregar Governance, Snapshot, transfers | Semana 2 |
| D3 | Sin acceso Supabase service_role key | Alta | Crear tablas manualmente vía Dashboard | Documentado |
| D4 | Redis cloud no accesible en dev | Baja | Fallback a Map en memoria | Implementado |

## 7. TypeScript / Build

```
npx tsc --noEmit → Solo errores pre-existentes en supabase-local.ts (no relacionados)
npx next build  → Compiled successfully (error pre-existente en solana-adapter.ts uuid)
```

## 8. Archivos del proyecto (FES)

```
src/
├── lib/services/rootstock/
│   ├── inactive-holder.service.ts          (429 lines)  — Detección
│   ├── cohort-assignment.service.ts         (95 lines)  — Segmentación
│   ├── message-templates.ts                (108 lines)  — Mensajes
│   ├── fes-storage.service.ts              (195 lines)  — Supabase CRUD
│   └── reactivation-tracker.service.ts     (135 lines)  — Tracking
├── app/api/
│   ├── fes/metrics/route.ts                (88 lines)   — Métricas
│   ├── fes/track/route.ts                  (35 lines)   — Tracking trigger
│   ├── fes/participants/route.ts           (52 lines)   — Lista participantes
│   └── rootstock/inactive-holders/route.ts (61 lines)   — Detección endpoint
└── app/preview/page.tsx                    (333 lines)  — Dashboard
supabase/migrations/
└── 001_create_fes_tables.sql               (47 lines)   — SQL migration
FES_DEPLOY.md                                              — Deploy docs
scripts/
├── test-fes-flow.mjs                                    — Unit tests
└── test-fes-endpoint.mjs                                — E2E validation
```

## 9. Backlog Semana 2

### Alta prioridad
| Item | Descripción | Esfuerzo | Dependencia |
|---|---|---|---|
| FES-01 | Integrar envío de mensajes (SendGrid para email, Telegram app) | 2d | Tablas creadas |
| FES-02 | Cron diario `POST /api/fes/track` vía Vercel Cron o BullMQ | 1d | FES-01 |
| FES-03 | Dashboard de conversión en `/preview` con datos reales de reactivación | 1d | FES-02 |
| FES-04 | Alerta cuando wallet VIP reactiva (Telegram/Discord) | 0.5d | FES-01 |
| FES-05 | Batch upsert inicial de participantes en Supabase al detection | 0.5d | Tablas creadas |

### Media prioridad
| Item | Descripción | Esfuerzo |
|---|---|---|
| FES-06 | Governance Subgraph: detectar votos como señal de actividad | 2d |
| FES-07 | RIF Transfer events via eth_getLogs: detectar holders que no stakearon | 2d |
| FES-08 | Snapshot API: detectar votación off-chain | 1d |
| FES-09 | Collective API: detectar registro en plataforma | 1d |

### Baja prioridad / Deuda técnica
| Item | Descripción |
|---|---|
| FES-10 | Tests unitarios para cohort assignment (jest) |
| FES-11 | Tests de integración para reactivation tracker |
| FES-12 | Rate limit monitoring para RPC calls |
| FES-13 | Migrar a greedy partition si el dataset crece (>100 wallets) |
| FES-14 | Playbook de incidentes: subgraph caído, RPC caído, Redis caído |

# FES Pilot — Progreso General

> Generado: 29 de junio de 2026
> Último commit: `96f2c00` — `feat: script generate-pilot-report.ts para reporte final del FES Pilot`

---

## ✅ Semana 1 — Infraestructura y preparación (COMPLETADO)

### Nico (commit `54ea620`)

| Item | Archivo | Estado |
|---|---|---|
| Pipeline de ingesta (sync-rootstock.ts) | `scripts/sync-rootstock.ts` | ✅ |
| Endpoints /api/rootstock/builders, proposals, health | `src/app/api/rootstock/` | ✅ |
| Detección de holders inactivos (>500 RIF, >30 días, pre-1-jun-2026) | `src/lib/services/rootstock/inactive-holder.service.ts` | ✅ |
| Asignación A/B determinística y balanceada | `src/lib/services/rootstock/cohort-assignment.service.ts` | ✅ |
| Supabase migrations + storage service | `supabase/migrations/001_create_fes_tables.sql` + `fes-storage.service.ts` | ✅ |
| Reactivation tracking | `src/lib/services/rootstock/reactivation-tracker.service.ts` | ✅ |
| Endpoint /api/fes/metrics | `src/app/api/fes/metrics/route.ts` | ✅ |
| Endpoint /api/fes/participants | `src/app/api/fes/participants/route.ts` | ✅ |
| Endpoint /api/fes/track | `src/app/api/fes/track/route.ts` | ✅ |
| Dashboard interno (movido a /internal/fes) | `src/app/[locale]/internal/fes/page.tsx` | ✅ |

### Nosotros (commit `5287be9` — GAP 1 y GAP 2)

| Item | Archivo | Estado |
|---|---|---|
| **GAP 1**: /preview como verificador público con input de wallet | `src/app/[locale]/preview/page.tsx` | ✅ |
| **GAP 2**: Mensaje Grupo B con rendimiento proyectado + builders | `src/lib/services/rootstock/message-templates.ts` | ✅ |
| YieldProjectionService (APR desde subgraph) | `src/lib/services/rootstock/yield-projection.service.ts` | ✅ |
| POST /api/fes/check-wallet (verificación individual) | `src/app/api/fes/check-wallet/route.ts` | ✅ |
| Middleware de protección (X-Internal-Key) | `src/middleware.ts` | ✅ |
| Endpoint cron /api/cron/fes-track | `src/app/api/cron/fes-track/route.ts` | ✅ |
| Informe de correcciones | `docs/reports/fes-pilot-fixes.md` | ✅ |

---

## ✅ Semana 2 — Distribución y monitoreo (EN PROGRESO)

### Logging de vistas a MongoDB + IPFS (commit `2919198`)

| Item | Archivo | Estado |
|---|---|---|
| FESViewLoggerService (registro en MongoDB) | `src/lib/services/rootstock/fes-view-logger.service.ts` | ✅ |
| Publicación diaria a IPFS vía Pinata | `src/lib/services/rootstock/fes-view-logger.service.ts` | ✅ |
| Integración en POST /api/fes/check-wallet | `src/app/api/fes/check-wallet/route.ts` | ✅ |
| Cron diario (00:30 UTC) fes-publish-views | `src/app/api/cron/fes-publish-views/route.ts` | ✅ |
| Endpoint /api/fes/view-stats | `src/app/api/fes/view-stats/route.ts` | ✅ |
| vercel.json con crons configurados | `vercel.json` | ✅ |

### Monitor de atribución (eventos Staked) — commit `553ce92`

| Item | Archivo | Estado |
|---|---|---|
| FESAttributionMonitorService (eventos Staked vía RPC) | `src/lib/services/rootstock/fes-attribution-monitor.service.ts` | ✅ |
| Cruce con walletHash de MongoDB + registro en Supabase | `src/lib/services/rootstock/fes-attribution-monitor.service.ts` | ✅ |
| Cron horario fes-attribution | `src/app/api/cron/fes-attribution/route.ts` | ✅ |
| Endpoint /api/fes/attributions (resumen + detalle) | `src/app/api/fes/attributions/route.ts` | ✅ |
| vercel.json con cron configurado | `vercel.json` | ✅ |

### Publicación de enlace

| Item | Estado |
|---|---|
| Publicar enlace a /preview en Discord/foro del Collective | ❌ PENDIENTE (manual) |

---

## ⏳ Semanas 3-4 — Observación y reporte (EN PROGRESO)

| Item | Estado |
|---|---|
| Mantener monitoreo durante 4 semanas | ❌ |
| Documentar incidencias técnicas | ❌ |
| Crear scripts/generate-pilot-report.ts | ✅ |
| Publicar informe en foro antes del 11 de julio | ❌ |
| Decisión: votación on-chain o cierre | ❌ |

---

## Resumen de archivos creados/modificados

```
Commit 5287be9 (GAP 1 y 2):
  docs/reports/fes-pilot-fixes.md                    | 176 ++++++
  src/app/[locale]/internal/fes/page.tsx             | 290 ++++++++++
  src/app/[locale]/preview/page.tsx                  | 596 ++++++-------
  src/app/api/cron/fes-track/route.ts                |  56 ++
  src/app/api/fes/check-wallet/route.ts              | 130 +++++
  src/app/api/fes/metrics/route.ts                   |  31 +-
  src/lib/services/rootstock/message-templates.ts    | 182 +++++--
  src/lib/services/rootstock/yield-projection.service.ts | 177 ++++++
  src/middleware.ts                                  |  59 ++
  9 files changed, 1307 insertions(+), 390 deletions(-)

Commit 2919198 (Logging MongoDB + IPFS):
  brand.md                                           |   1 +
  src/app/api/cron/fes-publish-views/route.ts        |  56 ++
  src/app/api/fes/view-stats/route.ts                |  37 ++
  src/lib/services/rootstock/fes-view-logger.service.ts | 274 ++++++++++
  src/app/api/fes/check-wallet/route.ts              |  12 +-
  vercel.json                                        |  14 +-
  6 files changed, 447 insertions(+), 3 deletions(-)

Commit 553ce92 (Monitor de atribución):
  src/app/api/cron/fes-attribution/route.ts          |  56 ++
  src/app/api/fes/attributions/route.ts              |  50 ++
  src/lib/services/rootstock/fes-attribution-monitor.service.ts | 375 ++++++++++
  vercel.json                                        |   1 +
  4 files changed, 481 insertions(+), 1 deletion(-)

Commit 96f2c00 (Script de reporte final):
  scripts/generate-pilot-report.ts                   | 384 ++++++++++
  1 file changed, 384 insertions(+)
```

---

## Próximos pasos

1. ✅ **Monitor de atribución** — Creado e implementado (commit `553ce92`)
2. ⏳ **Publicar enlace** — Compartir `https://rootstock.vercel.app/preview` en Discord/foro del Collective (manual)
3. ⏳ **Semanas 3-4** — Monitorear, documentar incidencias, generar reporte final

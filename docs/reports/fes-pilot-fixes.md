# FES Pilot — Corrección de Gaps Críticos

**Fecha:** 2026-06-24
**Autor:** Revisión de seguridad y producto
**Commits relacionados:** Correcciones sobre `54ea620` (feat: first version roockstock)

---

## Resumen

Se identificaron y corrigieron **2 gaps críticos** que bloqueaban el lanzamiento público del FES (Funding Efficiency Score) Pilot. Las correcciones abordan problemas de privacidad de datos de stakers y la efectividad del diseño experimental A/B.

---

## GAP 1: `/preview` — Exposición pública de wallets

### Problema

La página `/preview` original era un dashboard interno que listaba **todas las wallets inactivas con sus saldos, cohortes y mensajes**. Publicar ese enlace en Discord o foros permitiría a cualquiera ver quién tiene RIF y cuánto.

### Solución implementada

| Cambio | Archivo |
|---|---|
| Reescribir `/preview` como verificador público con input de wallet | `src/app/[locale]/preview/page.tsx` |
| Nuevo endpoint POST para verificación individual | `src/app/api/fes/check-wallet/route.ts` |
| Mover dashboard interno a `/internal/fes` | `src/app/[locale]/internal/fes/page.tsx` |
| Middleware de protección para rutas internas | `src/middleware.ts` |

#### Flujo del nuevo `/preview`

1. El usuario ingresa su address `0x...` en un input
2. `POST /api/fes/check-wallet` busca al holder, asigna cohorte, calcula proyección de rendimiento y genera el mensaje
3. La página muestra **SOLO** la información de esa wallet
4. La wallet se devuelve como `walletHash` (SHA-256 con sal rotativa) — nunca en texto plano
5. La vista se loguea en `fes_events` con `event_type: 'preview_view'`

#### Protección de rutas internas

El middleware (`src/middleware.ts`) protege:
- `/api/fes/metrics` — endpoint que contiene datos agregados de todos los holders
- `/internal/*` — dashboard interno con lista completa de holders

**Estrategia:**
- En desarrollo (`NODE_ENV=development`): acceso libre
- En producción: requiere header `X-Internal-Key` configurado vía `FES_INTERNAL_KEY` en env vars
- Sin header válido: responde `401 Unauthorized`

#### Hash de wallets

El `WalletHashService` (`src/lib/services/security/wallet-hash.service.ts`) ya existía en el códigobase. Se integró en:
- `POST /api/fes/check-wallet` — respuesta pública con wallet hasheada
- `GET /api/fes/metrics` — lista de holders con walletHash en lugar de address cruda
- Dashboard interno — muestra walletHash truncado

---

## GAP 2: Mensaje Grupo B — Sin personalización de rendimiento

### Problema

El mensaje Treatment (B) era un email genérico de inactividad, idéntico en esencia al Control (A). La hipótesis del experimento A/B depende de que el Grupo B reciba un mensaje **cualitativamente diferente** (personalizado con datos de su posición). Sin esa diferencia, los resultados del experimento no demuestran nada.

### Solución implementada

| Cambio | Archivo |
|---|---|
| Nuevo servicio de proyección de rendimiento | `src/lib/services/rootstock/yield-projection.service.ts` |
| Enriquecer templates con yield + builders | `src/lib/services/rootstock/message-templates.ts` |
| Actualizar `/api/fes/metrics` con proyección | `src/app/api/fes/metrics/route.ts` |

#### YieldProjectionService

El servicio calcula para cada holder inactivo:

1. **APR efectiva** del pool de staking:
   - Query al Rewards Subgraph (`backerStakingHistories`) para estimar rewards históricos
   - Fórmula: `rewards ≈ allocation × (time / secondsInYear) × 0.15`
   - Clampeada entre 5% y 30%
   - Fallback: 12% APR conservador si el subgraph no está disponible
   - Cache en Redis por 1 hora

2. **Rendimiento proyectado**:
   - `yieldRIF = balance × (APR / 100) × (daysInactive / 365)`

3. **Builders recomendados**:
   - Obtiene builders activos del `rootstockConnector.fetchAllBuilders()`
   - Fallback al `ROOTSTOCK_BUILDERS_REGISTRY` local
   - Selecciona top 3 para recomendar
   - Cache en Redis por 1 hora

#### Message Templates actualizados

**MessageContext** ahora incluye:
```typescript
interface MessageContext {
  wallet: string;
  balance: number;
  daysInactive: number;
  lastStakeActivity: string;
  projectedYield?: number;           // ← NUEVO
  recommendedBuilders?: Array<{      // ← NUEVO
    name: string;
    category: string;
    address: string;
  }>;
}
```

**Diferencias entre variantes:**

| Variante | Subject | Body |
|---|---|---|
| **Control (A)** | "RIF Staking Activity Report" | Informativo. "No action required." Sin CTA. |
| **Treatment (B)** | "Your X RIF could have earned ~Y RIF in rewards" | Incluye rendimiento proyectado, lista de builders activos, CTA a collective.rootstock.io, pasos para re-stakear. |
| **VIP** | "Important: Your X RIF position requires attention" | Outreach personalizado para whales, con datos de rendimiento y oferta de asistencia directa del equipo. |

Todos los templates existen en **inglés y español**.

---

## Cambios adicionales

### Endpoint cron para tracking periódico

`GET /api/cron/fes-track` — ejecuta el ciclo de tracking de reactivación para todos los participantes.

- Diseñado para Vercel Cron Jobs
- Protegido por `CRON_SECRET` (vía header `Authorization: Bearer <secret>` o query param `?secret=`)
- Llama internamente a `POST /api/fes/track` con `{ all: true }`

### `/api/fes/metrics` actualizado

- Wallets devueltas como `walletHash` en lugar de address cruda
- Cada holder incluye `yieldProjection` (projectedYieldRIF, aprUsed, recommendedBuilders)
- Metadata actualizada con nota de "Internal use only"

---

## Archivos creados

| Archivo | Propósito |
|---|---|
| `src/lib/services/rootstock/yield-projection.service.ts` | Cálculo de APR, proyección de rendimiento y builders recomendados |
| `src/app/api/fes/check-wallet/route.ts` | Endpoint público para verificación individual de wallet |
| `src/app/[locale]/internal/fes/page.tsx` | Dashboard interno (protegido por middleware) |
| `src/middleware.ts` | Middleware de protección para rutas internas |
| `src/app/api/cron/fes-track/route.ts` | Cron endpoint para tracking periódico |

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/app/[locale]/preview/page.tsx` | Reescrito: de dashboard interno a verificador público con input de wallet |
| `src/app/api/fes/metrics/route.ts` | Wallets hasheadas + yield projection por holder |
| `src/lib/services/rootstock/message-templates.ts` | Nuevos campos `projectedYield` y `recommendedBuilders` en context y templates |

---

## Variables de entorno requeridas

| Variable | Propósito | Default |
|---|---|---|
| `FES_INTERNAL_KEY` | Clave para acceder a rutas internas en producción | `dev-key-do-not-use-in-production` |
| `CRON_SECRET` | Secreto para ejecutar el cron endpoint | — |
| `THEGRAPH_API_KEY` | API key para consultar Rewards Subgraph (opcional, mejora precisión de APR) | — |

---

## Próximos pasos recomendados

1. **Ejecutar migración SQL** de `supabase/migrations/001_create_fes_tables.sql` en la base de datos de producción
2. **Configurar Vercel Cron Job** apuntando a `/api/cron/fes-track` con el `CRON_SECRET`
3. **Configurar `FES_INTERNAL_KEY`** en producción y distribuir solo al equipo
4. **Publicar enlace a `/preview`** en Discord/foros — ahora es seguro para uso público
5. **Monitorear reactivaciones** vía el dashboard interno en `/internal/fes`

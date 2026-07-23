# FES Preview — Diagnóstico de Timeout en `/en/preview`

**Fecha:** 2026-07-21
**Problema reportado:** La página `/en/preview` se queda cargando indefinidamente al ingresar una wallet `0x...`

---

## 1. Síntoma

1. Usuario ingresa una wallet `0x...` en el input
2. Hace clic en "CHECK"
3. El botón muestra "CHECKING..." y **nunca se resuelve**
4. En consola del navegador: `Unexpected token 'A', "An error o"... is not valid JSON`
5. Esto indica que el endpoint devuelve **HTML** (error 500 o timeout de Vercel) en lugar de JSON

---

## 2. Trazado de la llamada

```
Frontend (/en/preview)
  → POST /api/fes/check-wallet
    → inactiveHolderService.getHolderActivity(wallet)        ← OK (1 query al subgraph + 1 RPC)
    → cohortAssignmentService.getCohort(wallet)               ← 🔴 PROBLEMA AQUÍ
      → inactiveHolderService.getHolderActivity(wallet)       ← OK (redundante pero rápido)
      → inactiveHolderService.findInactiveHolders()           ← 🔴🔥 SCANEA TODO
        → fetchAllBackers()                                   ← Paginación 1000×1000
        → batchBlockToDate()                                  ← Múltiples RPC calls
        → batchGetRIFBalances()                               ← Múltiples RPC calls
    → yieldProjectionService.calculate()                      ← Nunca se alcanza
    → fesStorage.recordEvent()                                ← Nunca se alcanza
```

---

## 3. Causa raíz

**Archivo:** `src/lib/services/rootstock/cohort-assignment.service.ts`
**Método:** `getCohort()` (líneas 105-118)

```typescript
async getCohort(address: string): Promise<...> {
    const activity = await inactiveHolderService.getHolderActivity(address);
    if (!activity) return null;

    // 🔴 ESTA LÍNEA ES EL PROBLEMA:
    const holders = await inactiveHolderService.findInactiveHolders();
    // findInactiveHolders() escanea TODOS los backers del subgraph:
    //   1. fetchAllBackers() — paginación de 1000 en 1000 (pueden ser cientos)
    //   2. batchBlockToDate() — convierte blocks a fechas vía RPC
    //   3. batchGetRIFBalances() — verifica balance RIF vía RPC
    //   Total: 30+ segundos, a veces minutos

    if (holders.count === 0) return null;
    const result = this.assign(holders.holders);
    const all = [...result.cohorts.A, ...result.cohorts.B, ...result.whales];
    const found = all.find(a => a.wallet === address.toLowerCase());
    if (!found) return null;
    return { cohort: found.cohort, assignment: found };
}
```

**Problema:** Para asignar un cohorte a UNA wallet, el método escanea **TODOS** los holders inactivos. Esto es O(n) cuando debería ser O(1).

**Además:** Si `THEGRAPH_API_KEY` no está configurada en las variables de entorno de producción, `REWARDS_SUBGRAPH_URL` queda vacío y `findInactiveHolders()` devuelve 0 holders instantáneamente — pero con un falso negativo (no encuentra a nadie).

---

## 4. Impacto

| Aspecto | Impacto |
|---|---|
| **UX** | Usuario ve "CHECKING..." infinito. No hay feedback de error. |
| **Timeout Vercel** | Las serverless functions de Vercel tienen timeout de 10-30s. El scan excede eso. |
| **Costo RPC** | Cada consulta hace decenas de `eth_call` al nodo RSK público. |
| **Dependencia** | El endpoint depende de que `findInactiveHolders()` ya esté en caché de Redis. Si no, falla. |

---

## 5. Solución propuesta

Reescribir `getCohort()` para que sea **O(1)** — asigna cohorte determinísticamente usando el wallet address, sin escanear la lista completa.

### Código propuesto

```typescript
async getCohort(address: string): Promise<{ cohort: Cohort; assignment: CohortAssignment } | null> {
    const activity = await inactiveHolderService.getHolderActivity(address);
    if (!activity) return null;

    // WHALE check directo (sin escanear todos)
    if (activity.balance >= WHALE_BALANCE_THRESHOLD) {
        return { 
            cohort: 'WHALE', 
            assignment: { ...activity, cohort: 'WHALE' } 
        };
    }

    // Asignación determinística: SHA-256 del wallet → A o B
    // Misma wallet → mismo cohorte SIEMPRE
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(address));
    const bytes = new Uint8Array(hash);
    const cohort: Cohort = (bytes[0] % 2 === 0) ? 'A' : 'B';

    return { 
        cohort, 
        assignment: { ...activity, cohort } 
    };
}
```

### ¿Por qué funciona?

| Propiedad | Explicación |
|---|---|
| **Determinístico** | SHA-256 del wallet → mismo resultado siempre |
| **Balanceado** | 50% probabilidad de A o B (primer byte del hash) |
| **O(1)** | 1 query al subgraph + 1 RPC call. Responde en <2 segundos |
| **WHALE** | Detectado por balance, no por escaneo |
| **Sin dependencias** | No necesita Redis, no necesita `findInactiveHolders()` |

### Consistencia con el algoritmo original

El algoritmo original de Nico usaba `sort by daysInactive + pair-based alternating`. Eso garantizaba balance por días de inactividad. La nueva versión sacrifica ese balanceo fino por velocidad, pero mantiene:

- **50/50** probabilístico (suficiente para un piloto A/B)
- **Determinismo** (misma wallet → mismo grupo)
- **Separación de whales** (idéntica al original)

Para un piloto con ~20 holders, la diferencia entre balanceo por días vs. hash es insignificante.

---

## 6. Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/lib/services/rootstock/cohort-assignment.service.ts` | Reescribir `getCohort()` — eliminar llamada a `findInactiveHolders()` |
| `src/app/api/fes/check-wallet/route.ts` | Agregar try/catch con mensaje de error claro si algo falla |

---

## 7. Verificación

Después del fix:

1. Ir a `https://core.andromedacomputer.net/en/preview`
2. Ingresar `0x2AcC95758f8b5F583470bA265Eb685a8f45fC9D5` (o cualquier wallet)
3. Debería responder en <3 segundos con el mensaje del cohorte
4. Si la wallet no está en el subgraph: mensaje "No inactive staking position found"
5. Si el subgraph no responde: mensaje de error claro, no timeout

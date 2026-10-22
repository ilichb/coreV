# FES Pilot — Plan de Pruebas

**Suites:** 5 archivos · **33 pruebas** en verde (20/10/2026)
**Runner:** Jest acotado a `src/` (`jest.config.js`). Los tests de
`packages/avip-contracts` usan su propio runner (hardhat) y quedan fuera.

```bash
yarn test                                   # toda la suite
npx jest src/lib/services/rootstock         # solo FES
node scripts/fes-readiness-gate.mjs         # gate (incluye la suite)
```

---

## 1. Cobertura por defect corregido

### 1.1 Cohortes (C1, C2) — `cohort-assignment.service.test.ts`

| Prueba | Qué blinda |
|---|---|
| Clasifica ≥ 1M RIF como `VIP`, no `WHALE` | Regresión de C2 |
| Umbral VIP **inclusivo** en 1.000.000 | Contrato del diseño |
| `flatten` nunca produce `WHALE` | El CHECK de `fes_participants` solo acepta A/B/VIP |
| Alterna A/B por pares de forma **determinista** (misma entrada → misma asignación) | Asignación reproducible |
| `flatten` devuelve A + B + VIP sin duplicados | Integridad |
| `summary.vip` refleja el total RIF | Métricas |

### 1.2 Endpoint público (C1) — `check-wallet.route.test.ts`

| Prueba | Qué blinda |
|---|---|
| Wallet **no** en la lista congelada → `inPilot: false`, sin cohorte y **sin** evento de vista | Una wallet ajena no entra al experimento (antes: fallback `% 2`) |
| Wallet en la lista → cohorte y variante salen de la fila congelada; la proyección usa los datos congelados | Una sola fuente de verdad |
| La wallet de la respuesta va hasheada con hash **determinista** entre consultas | Regresión de N1 |
| Address mal formada → 400 | Validación |
| 31ª consulta desde la misma IP → 429 con `Retry-After` | N8 |

### 1.3 Guard de congelamiento (C3/N4) — `seed-participants.route.test.ts`

| Prueba | Qué blinda |
|---|---|
| `commit:true` sobre lista no vacía → **409** y no escribe (ni siquiera gasta la detección) | El treatment del experimento no se re-asigna |
| `restore:true` explícito → procede | Recuperación posible y deliberada |
| Primer seed (tabla vacía) → escribe, solo con etiquetas A/B/VIP | Flujo normal |
| Dry-run sobre lista congelada informa el guard | Visibilidad |

### 1.4 Monitor on-chain (M1, M2, N5) — `fes-attribution-monitor.service.test.ts`

| Prueba | Qué blinda |
|---|---|
| `Transfer` al proxy en tx `depositAndDelegate` → `stake` | Clasificación correcta |
| `Transfer` desde el proxy en tx `withdrawTo` → `unstake` | Clasificación correcta |
| **Ignora** un transfer simple al proxy (input `transfer(...)`) | Falsos positivos (riesgo §5.4 del manual) |
| Ignora wallets fuera de la cohorte congelada | Solo el piloto |
| Atribuye si hubo vista **previa** y el stake queda en la ventana | Regla de atribución |
| **No** atribuye si nunca vio `/preview` | Sin vista no hay atribución |
| **No** atribuye si el stake es **previo** a la vista | Orden temporal |
| Usa la **primera** vista, no la más reciente | Recorrido del usuario |
| Falla ruidosamente si falta `STAKING_CONTRACT_ADDRESS` | N1/M3: nunca clasificar contra dirección inventada |
| **No** avanza el cursor si Blockscout falla (y reintenta antes de rendirse) | M2: "no pude leer" ≠ "no pasó nada" |
| **No** avanza el cursor si falla el timestamp de bloque | Misma garantía |
| Retoma desde el checkpoint guardado | N5: no rescanea desde cero |
| Sin cohorte congelada no escanea ni guarda checkpoint | Ahorro y seguridad |

### 1.5 Rate limiting (N8) — `rate-limit.test.ts`

| Prueba | Qué blinda |
|---|---|
| Límite respetado y siguiente intento bloqueado | Ventana fija |
| Claves independientes | Una IP no bloquea a otra |
| La ventana **expira** y libera la cuota | Regresión contra el fallback en memoria de `redisService` (nunca expiraba) |
| `clientIp` lee `x-forwarded-for` / `x-real-ip` | Identificación correcta detrás del proxy |

---

## 2. Pruebas negativas end-to-end (camino público)

Ejecutadas contra el código con dobles (mocks de Supabase/RPC/Blockscout):

1. Wallet inexistente en el piloto → no recibe cohorte ni mensaje.
2. Wallet con formato inválido → 400.
3. Supabase sin permisos (RLS) → la vista se registra como `viewLogged: false`
   (verificado en vivo contra el proyecto real: el rol `anon` recibe
   `permission denied`).
4. Sin `STAKING_CONTRACT_ADDRESS` → el monitor lanza, el cron responde 500.
5. Sin `CRON_SECRET` → los crons se niegan a ejecutarse.
6. Re-seed sobre lista congelada → 409.
7. Fuerza bruta contra `/api/internal/login` → 429.

## 3. Lo que **no** se pudo probar desde este entorno

| Qué falta | Por qué | Cómo probarlo cuando haya acceso |
|---|---|---|
| Ensayo vivo del monitor contra la cadena | Requiere `STAKING_CONTRACT_ADDRESS` + `RIF_TOKEN_ADDRESS` + despliegue | Llamar `GET /api/cron/fes-attribution` con `CRON_SECRET` y verificar que la fixture `0x88e85d2d…510ba` aparece en `fes_stake_events` exactamente una vez |
| Migración 002 aplicada | Sin connection string | Aplicar `supabase/migrations/002_fes_stake_events.sql` y re-ejecutar el gate |
| Variables de entorno de Vercel | Sin CLI/auth | Verificar `FES_WALLET_HASH_SALT`, `CRON_SECRET`, `STAKING_CONTRACT_ADDRESS`, `RIF_TOKEN_ADDRESS`, `BLOCKSCOUT_API_KEY` (el anónimo de Blockscout responde 429 con ventanas largas) |
| Ventana completa de 28 días | Requiere distribución real (D2) | Publicar el enlace y monitorear `/internal/fes` |
| Continuidad de hashes v2 → v3 en MongoDB | Datos previos | Regenerar vistas si se quiere el histórico |

## 4. Criterio de salida (definition of done)

- [x] `yarn test` en verde (33/33)
- [x] `yarn build` sin errores (103 s)
- [x] `npx tsc --noEmit` sin errores
- [x] Gate local: 0 FAIL
- [ ] Ensayo vivo con transacción real (F5) — **pendiente de despliegue**
- [ ] Verificación post-despliegue de env vars y migración

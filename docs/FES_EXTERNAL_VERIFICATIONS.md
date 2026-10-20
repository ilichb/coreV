# FES Pilot — Verificaciones Externas

El manual (§10) exige que **todo dato publicable** quede contrastado contra una
fuente externa, con fecha, fuente y resultado. Este documento es ese registro.
Todo se verificó el **20 de octubre de 2026** contra **Rootstock mainnet**
(Blockscout + RPC), **Supabase** e **IPFS**, de forma independiente al manual y
a la memoria de la conversación.

---

## 1. Contrato de staking

| Dato | Fuente | Resultado |
|---|---|---|
| Proxy stRIF (para leer) | Blockscout, pestaña del contrato `0x5Db91E24BD32059584bbdB831a901F1199f3D459` | ✅ Coincide con el manual: proxy ERC-1967, "Staked RIF" |
| Slot de implementación (EIP-1967) | Lectura de storage por RPC | ✅ `0xC92B149fCDcf176D7e7A41eb51f56668B7BABe03` |
| Implementación vigente | Blockscout, contrato `0xC92B149…Be03` | ✅ StRIFTokenV02 |
| Implementación obsoleta (`0xcC13a032…`) | — | ⚠️ No usada en ninguna parte del código nuevo |

### Eventos del ABI (supuesto §11.1 del manual)

Obtenidos del ABI publicado en Blockscout: **10 eventos, ninguno `Staked`**:

`Approval` · `OwnershipTransferred` · `CollectiveRewardsAddress` ·
`STRIFCollectiveRewardsErrorSkipChangedTo` · `DelegateChanged` · `Transfer` ·
`DelegateVotesChanged` · `Upgraded` · `EIP712DomainChanged` · `Initialized`

**Conclusión:** el supuesto del manual es correcto y el monitor original estaba
construido sobre un evento inexistente.

### Topic0 de `Transfer` (recalculado de forma independiente)

```
keccak256("Transfer(address,address,uint256)")
= 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
```

Recalculado localmente con `ethers.keccak256` (no tomado del documento): ✅
coincide con el topic0 observado en los logs reales.

### Selectores de función (recalculados)

```
keccak256("depositAndDelegate(address,uint256)")[0:4] = 0xfbde32f8   ✅
keccak256("withdrawTo(address,uint256)")[0:4]         = 0x205c2878   ✅
```

Ambos cruzados contra el ABI completo del contrato: coinciden con las funciones
homónimas.

---

## 2. Token RIF (supuesto §11.3 del manual — el manual no lo fija)

| Dato | Fuente | Resultado |
|---|---|---|
| Dirección del token RIF en Rootstock mainnet | Blockscout ( transfers del proxy, y documentación oficial) | ✅ `0x2AcC95758f8b5F583470bA265Eb685a8f45fC9D5` |

---

## 3. Transacciones de referencia (fixtures)

Se tomó una transacción real de stake por cohorte y se verificó su
receipt completa por RPC y sus logs por Blockscout:

| Cohorte | tx | Bloque | Fecha | Log | Verificado |
|---|---|---|---|---|---|
| B | `0x88e85d2dd8ff040c13de41c3f320f1efc180c709ce725d28064937fc386510ba` | 9301064 | 06/10/2026 | `logIndex 1` | ✅ status 0x1, `input` empieza con `0xfbde32f8`, Transfer de RIF hacia el proxy |
| A | `0x2945dfbc8a15aabc3845e39cd1f14194673fcecd5a75a48a213df0652339a8c8` | 9299400 | 05/10/2026 | `logIndex 0` | ✅ ídem |

Estas dos transacciones son las fixtures de los tests del monitor. **Ninguna de
las dos tenía vista previa registrada**, por lo que sirven también como
**negativo obligatorio**: el monitor no debe atribuirlas.

---

## 4. Soporte de `eth_getLogs` (supuesto §11 / hallazgo M5)

| Fuente | Resultado |
|---|---|
| `https://mainnet.sovryn.app/rpc` | ❌ Rechaza por rango máximo de bloques |
| RPC público rskj | ❌ Rechaza por rango |
| blastapi / tenderly / sks / drpc | ❌ (403 / 404 / SSL / 400, según el manual; no re-probados) |
| **Blockscout API** (`/api?module=logs&action=getLogs`) | ✅ Responde correctamente con filtros `address` + `topic0` |

**Decisión implementada:** logs por Blockscout con reintentos (3) y
sub-división automática del rango si la respuesta llega al límite de 1.000
logs. El número y el timestamp de bloque sí se piden por RPC.

---

## 5. Snapshot en IPFS

| Dato | Fuente | Resultado |
|---|---|---|
| CID publicado `QmZZpiMZcLmsm3K8ASHaXB3t9Pkdi4ZNsYci7FWTY9ja9b` | Descarga del gateway IPFS + comparación byte a byte con `local-snapshots/fes-snapshot-public.json` | ✅ Idéntico |
| Contenido | `local-snapshots/fes-snapshot-custody.json` (NO PUBLICAR; está en `.gitignore`) | ⚠️ Contiene **18** wallets, no las 16 del manual |

---

## 6. Base de datos (Supabase)

| Dato | Fuente | Resultado |
|---|---|---|
| Participantes en `fes_participants` | Consulta directa | ✅ **18 filas** (A9 / B8 / VIP1) |
| Vistas `preview_view` en `fes_events` | Consulta directa | ✅ 7 (todas de pruebas internas) |
| Atribuciones `attributed_stake` | Consulta directa | ✅ 0 |
| RLS bloquea al rol `anon` | Consulta con la anon key | ✅ `permission denied` |
| Service role solo en servidor | Revisión de código (`getSupabaseAdmin()`) | ✅ No se expone al cliente |

---

## 7. API key de The Graph

| Dato | Fuente | Resultado |
|---|---|---|
| ¿Sigue viva la clave expuesta? | Llamada de prueba al gateway | ⚠️ **Sí, sigue activa** |

**Acción pendiente (externa):** rotarla en The Graph, reemplazarla en Vercel y
en `.env` local. Hasta entonces, el piloto depende de una credencial filtrada.

---

## 8. Repositorio y despliegue

| Dato | Fuente | Resultado |
|---|---|---|
| `main` y `solana-hackathon` sin ancestro común (afirmación G1 del manual) | `git merge-base` | ❌ **No se reproduce**: existe merge-base `ea1ada6` |
| Estado de `main` | `git log` | `b0f2b73` → `5d9d328` (S1/S2) → `9368a31` (correcciones FES) |
| Crons en `vercel.json` | Lectura del archivo | ✅ `sync-ecosystems` y `fes-track` (06:00 UTC). La atribución se integró en `fes-track` (límite Hobby: 2) |
| Build de producción | `yarn build` | ✅ Sin errores (103 s) |
| Typecheck | `npx tsc --noEmit` | ✅ Sin errores |

---

## 9. Pendientes de verificar **tras** el despliegue (no verificables hoy)

1. Que el bundle de producción tenga `NEXT_PUBLIC_SUPABASE_URL` correcta (E1).
2. Que `FES_WALLET_HASH_SALT`, `CRON_SECRET`, `STAKING_CONTRACT_ADDRESS` y
   `RIF_TOKEN_ADDRESS` existan en Vercel.
3. Que el cron diario se ejecute con `CRON_SECRET` y reporte `success: true`.
4. Que la fixture `0x88e85d2d…` aparezca **una sola vez** en
   `fes_stake_events` tras el primer escaneo vivo.
5. Que el total incremental recalculado desde los logs en cadena coincida con
   lo que reporta el dashboard (el manual exige recalcularlo desde la cadena,
   no desde `fes_participants`).

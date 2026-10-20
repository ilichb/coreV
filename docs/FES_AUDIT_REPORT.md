# FES Pilot — Informe de Auditoría

**Repo:** `coreV` · **Marco:** `docs/core_manual_FES.pdf` (9 páginas, octubre 2026)
**Fecha de la auditoría:** 20 de octubre de 2026
**Estado de lanzamiento:** **BLOCKED** (todo lo local pasa · 8 acciones externas pendientes)

> Regla de oro del manual (§ "leer primero"): *todo dato del documento es una
> afirmación a verificar, no un hecho probado*. Este informe usa la misma
> numeración de hallazgos que el manual (M/C/E/S/G/D) y agrega los nuevos con
> prefijo **N**. Cada fila indica qué decía el manual, qué encontré al
> verificarlo y qué se hizo.

---

## 1. Resumen ejecutivo

El diagnóstico del manual era correcto en su causa raíz: el monitor estaba
construido sobre un evento `Staked` que **no existe** en el contrato. Pero esa
no era la única falla silenciosa. La cadena completa era:

`evento inexistente` → `dirección placeholder` → `getLogs sin soporte en los
RPCs públicos` → `catch que convertía el error en []` → `checkpoint que nunca
se escribía` → `hashes de wallet no reproducibles entre reinicios`.

Cada eslabón por sí solo ya producía "Staked = 0"; juntos garantizaban un
resultado **falso y publicable**, no un dato. Los seis están corregidos y
cubiertos por pruebas.

Las cohortes también: el fallback pseudoaleatorio, la etiqueta `WHALE` que
rompía el CHECK de la tabla, y la ausencia de escrituras tienen hoy una lista
congelada con guard anti-reseed.

Lo que impide abrir la ventana hoy **no es el código**: es la cifra
autoritativa de participantes (manual 16 · foro 19 · base y snapshot IPFS 18),
una API key comprometida que sigue viva, la migración de base de datos y las
variables de entorno de Vercel.

---

## 2. Verificación de los hallazgos del manual

### 2.1 Monitor de staking (M1–M5) — **todos confirmados y corregidos**

| ID | Decía el manual | Verificado | Estado |
|---|---|---|---|
| **M1** (P0) | El monitor asume `Staked(address,uint256,uint256)`, inexistente | ✅ Confirmado. La ABI de StRIFTokenV02 (`0xC92B149fCDcf176D7e7A41eb51f56668B7BABe03`) tiene **10 eventos y ninguno es `Staked`** (ver `FES_EXTERNAL_VERIFICATIONS.md`) | **CORREGIDO**: detección reescrita sobre `Transfer` ERC-20 |
| **M2** (P0) | `STAKED_EVENT_SIG` es un hex inventado | ✅ Confirmado: `0x5c2c7e4b…` no corresponde a ninguna firma del ABI | **CORREGIDO**: eliminado; se usa el topic0 real de `Transfer` |
| **M3** (P0) | `STAKING_CONTRACT_ADDRESS` es un placeholder | ✅ Confirmado: el código tenía `0x9Fb7cB8C6A1bEe5C8f3c1b2E5f6a7b8c9d0e1f2a` (no existe) | **CORREGIDO**: constante verificada `0x5Db91E24BD32059584bbdB831a901F1199f3D459` (proxy, nunca la implementación); si falta la variable, el monitor **falla a propósito** |
| **M4** (P0) | No hay cron en `vercel.json` | ⚠️ **Desactualizado**: hoy sí existe (`/api/cron/fes-track`, diario 06:00 UTC). El problema real era otro (ver **N3**) | **RESUELTO**: la atribución se integró en ese cron (Hobby admite 2 crons) |
| **M5** (P1) | `eth_getLogs` falla en RPCs públicos | ✅ Confirmado (sovryn.app y rskj rechazan por rango; blastapi 403, tenderly 404) | **CORREGIDO**: logs vía API de Blockscout, con reintento y sub-división de rango |

**Nueva lógica implementada** (§5.2 del manual, verificada contra dos
transacciones reales):

```
stake   = Transfer de RIF → proxy, en tx cuyo input empieza con depositAndDelegate(address,uint256) = 0xfbde32f8
unstake = Transfer de RIF ← proxy, en tx cuyo input empieza con withdrawTo(address,uint256)       = 0x205c2878
```

El manual advirtió el riesgo de falsos positivos ("transferir RIF al contrato
no siempre es stakear"). Se mitigó contrastando la **función invocada** en la
transacción, no solo la dirección: un transfer simple al proxy ya no cuenta
(test `IGNORA un transfer simple al proxy sin depositAndDelegate`).

### 2.2 Cohortes (C1–C3) — **todos confirmados y corregidos**

| ID | Decía el manual | Verificado | Estado |
|---|---|---|---|
| **C1** (P0) | Fallback `assignSingleHolder` activo: cohorte = `daysInactive % 2` | ✅ Confirmado, y peor de lo descrito: el fallback se activaba cuando `findInactiveHolders` fallaba, es decir **bajo estrés** | **CORREGIDO**: `check-wallet` resuelve la cohorte solo desde `fes_participants`; el fallback fue eliminado del servicio |
| **C2** (P0) | El código emite `WHALE` en vez de `VIP`; viola el CHECK | ✅ Confirmado. El route parcheaba el síntoma con `toTableCohort()` | **CORREGIDO**: etiqueta unificada en servicio, rutas y dashboards; test que impide regresar a `WHALE` |
| **C3** (P0) | Nadie llama a `batchUpsertParticipants`; `fes_participants` vacía | ⚠️ **Parcialmente desactualizado**: ya existía `POST /api/fes/seed-participants` que la puebla, y la tabla hoy tiene **18 filas** | **RESUELTO** + nuevo guard: re-seed responde **409** salvo `{ "commit": true, "restore": true }` |

**Discrepancia sin resolver (E2):** el manual dice **16** wallets (8/7/1), el
foro publicó **19**, y la base de datos + el snapshot IPFS verificado dicen
**18**. No se modificó ninguna fuente: decidir cuál es la correcta requiere a
Rootstock. **No publicar cifra alguna hasta confirmarlo.**

### 2.3 Seguridad (S1–S4)

| ID | Decía el manual | Verificado | Estado |
|---|---|---|---|
| **S1** (P0) | `wallets.csv` (10.000 wallets) en el repo público | ✅ Confirmado (`wallets/csv`, `wallets/pilot-candidates.json`, `metrics_response.json`, `metrics_out.json` trackeados) | **CORREGIDO**: fuera del tracking + `.gitignore`. **Nota:** el historial de git conserva las versiones anteriores; si el repo es o fue público, se recomienda tratar esos datos como filtrados |
| **S2** (P0) | API key de The Graph hardcodeada | ✅ Confirmado en `validate-inactive-holders.mjs`… y el gate halló una **tercera copia** en `scripts/test-fes-endpoint.mjs` | **CORREGIDO** en código (ambos scripts la leen del entorno y fallan si falta). **La clave sigue activa: rotar (acción externa)** |
| **S3** (P0) | `/api/fes/participants` sin autenticación | ✅ El endpoint existe y devuelve addresses en claro; el middleware ya lo protegía con la lista `INTERNAL_FES_APIS` | **RESUELTO**; además el gate detectó una fuga equivalente nueva: **N2** |
| **S4** (P0) | El dashboard interno perdió su login por un force-push | ✅ El auth fue reestablecido (`fes-admin.ts` + cookie + middleware). Decisión del manual: adoptar `fes_admin.ts` sobre `fes_dashboard_session` | **RESUELTO** + rate-limit en login (**N8**) |

### 2.4 Entorno y datos (E1–E3, G1)

| ID | Decía el manual | Verificado | Estado |
|---|---|---|---|
| **E1** (P0) | `NEXT_PUBLIC_SUPABASE_URL` se inlina en build-time | ✅ Riesgo real. En este entorno el `.env` tiene **dos** proyectos Supabase (ref `tmqiej…` activa y correcta; ref `lhdtjr…` legacy) | **PARCIAL**: el código usa la correcta; falta verificar el bundle desplegado (requiere Vercel) |
| **E2** (P0) | El cliente usa la anon key en vez de service role | ✅ Correcto por diseño: `getSupabaseAdmin()` (service role) se usa solo en servidor; RLS bloquea al rol `anon` (verificado en vivo) | **PASS** |
| **E3** (P1) | Redis caído o eliminado | ✅ Confirmado que el fallback en memoria es problemático (ver **N1**) | **CORREGIDO** para rate-limit y para el cursor del monitor (Supabase); el resto del código tolera el fallback |
| **G1** (P1) | `main` y `solana-hackathon` sin ancestro común | ❌ **No confirmado**: existe merge-base (`ea1ada6`). La afirmación del manual no se reproduce con el estado actual del repo | **DESCARTADO** como bloqueante; revisar con el dueño por qué el manual la afirmaba |

### 2.5 Distribución (D1, D2)

| ID | Hallazgo | Estado |
|---|---|---|
| **D1** | Cifra publicada 19 vs real 16 | **ABIERTO** (aquí: 16 vs 18 vs 19). Corregir en el foro antes de publicar el enlace |
| **D2** | 0 visitas orgánicas a `/preview`: sin distribución no hay tratamiento | **ABIERTO, fuera del alcance del código**. Hoy hay 7 eventos `preview_view` (de pruebas internas) y 0 atribuciones. Es el cuello de botella real |

---

## 3. Hallazgos nuevos de esta auditoría (no están en el manual)

| ID | Severidad | Hallazgo | Fix |
|---|---|---|---|
| **N1** | **Crítica** | Los hashes de wallet del piloto usaban una **sal aleatoria en memoria** con persistencia simulada (`persistSalt` solo logueaba). Tras cada reinicio la misma wallet producía un hash distinto → el join entre `fes_events` y `fes_attributions` se rompía y las reactivaciones reales quedaban huérfanas (Staked = 0 aunque hubiera stake) | Esquema **v3: HMAC-SHA256** con `FES_WALLET_HASH_SALT`, aplicado a los call sites FES. En producción sin la sal, **falla a propósito**. Atlas (GDPR) queda en v2 para no romper su comportamiento |
| **N2** | Alta | `/api/fes/track` era pública y devolvía `reactivated_wallets` con **addresses en claro** más el detalle por wallet | Agregada a `INTERNAL_FES_APIS` + matcher |
| **N3** | Alta | Los crons eran **fail-open**: sin `CRON_SECRET` ejecutaban igual; `fes-track` llamaba por HTTP a `/api/fes/track` con el fallback `dev-key-do-not-use-in-production` | Fail-closed en ambos; `fes-track` llama a los servicios en proceso |
| **N4** | Alta | `seed-participants` con `commit:true` re-escribía la lista congelada: re-asignaba cohortes y destruía el tratamiento del experimento | Guard de congelamiento (409) + modo `restore` explícito |
| **N5** | Alta | El cursor de escaneo vivía en Redis con TTL de 24 h: el escaneo se reiniciaba y perdía eventos | Cursor en Supabase (`fes_monitor_state`, migración `002`) |
| **N6** | Alta | `last_block_checkpoint` no se escribía en ningún flujo: `delta` siempre `null`, `reactivated` siempre `false` | El primer check persiste la línea de base |
| **N7** | Media | Sin infraestructura de pruebas (`jest` instalado, sin configuración ni tests) | Jest acotado a `src/`; **33 pruebas** |
| **N8** | Media | Sin rate-limit en login ni en el camino público `/preview` | Limitador propio: login 5/15 min, check-wallet 30/min |
| **N9** | Baja | `/test-dashboard` es una página de diagnóstico **pública** | Recomendación: moverla bajo `/internal/` (no filtra datos en producción porque sus APIs están protegidas) |
| **N10** | Baja | Registros previos al esquema v3 en MongoDB guardan hashes v2 y ya no hacen join | Las vistas se re-acumulan; regenerarlos si se quiere continuidad histórica |

---

## 4. Qué se verificó como correcto (sin cambios)

- **Snapshot IPFS** `QmZZpiMZcLmsm3K8ASHaXB3t9Pkdi4ZNsYci7FWTY9ja9b`: descargado y
  comparado **byte a byte** con `local-snapshots/fes-snapshot-public.json`.
- **RLS en Supabase**: `fes_participants` y `fes_events` rechazan al rol `anon`;
  las tablas de la migración 002 habilitan RLS sin policies de lectura.
- **Service role solo en servidor**: `getSupabaseAdmin()` no se expone al cliente.
- **Protección de `local-snapshots/`**: en `.gitignore`; las 18 wallets crudas
  del snapshot de custodia **no** están en git.
- **Auth del dashboard interno**: cookie con `FES_ADMIN_PASSWORD`, protegida por
  middleware en páginas y APIs.
- **Idempotencia del seed**: upsert por PK de wallet.

---

## 5. Cómo re-verificar este informe

```bash
yarn test                                  # 33 pruebas
node scripts/fes-readiness-gate.mjs --build # gate completo
```

Salidas del gate: `0` READY · `1` NOT READY (FAIL) · `2` BLOCKED (solo externos).
**Hoy: 2 (BLOCKED) — 0 FAIL, 8 EXTERNAL.**

Documentos complementarios: `FES_REQUIREMENTS_MATRIX.md` (requisito por
requisito, incluye §8 "debe/no debe" y §11 supuestos),
`FES_TEST_PLAN.md`, `FES_EXTERNAL_VERIFICATIONS.md`.

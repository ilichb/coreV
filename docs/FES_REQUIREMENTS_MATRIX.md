# FES Pilot — Matriz de Requisitos

Estado por requisito del `docs/core_manual_FES.pdf`, verificado contra el código
y contra fuentes externas el 20/10/2026.

Leyenda: **PASS** verificado y cumple · **PARTIAL** cumple con reservas ·
**FAIL** no cumple · **BLOCKED** no se pudo verificar desde este entorno ·
**N/A** no aplica.

---

## 1. Pipeline del experimento (§2.3, Figura 1)

| # | Paso | Estado | Evidencia / reserva |
|---|---|---|---|
| 1 | Universo de 10.000 wallets inactivas | PASS | `inactive-holder.service.ts` pagina el subgraph y normaliza balances |
| 2 | Filtro de calificación (`validate-inactive-holders`) | PASS | Script funciona; ahora exige `THEGRAPH_API_KEY` del entorno (S2 corregido) |
| 3 | Cohorte calificada | **PARTIAL** | La DB y el snapshot IPFS tienen **18** wallets; el manual dice 16 y el foro 19. Discrepancia sin resolver (**E2**) |
| 4 | Asignación determinista y congelada | PASS | Fallback `% 2` eliminado (C1); etiqueta unificada (C2); guard anti-reseed (N4); cohortes persistidas y consultables sin Redis |
| 5 | Enlace `/preview` como canal oficial | **PARTIAL** | El endpoint existe y funciona; **0 visitas orgánicas** (D2) |
| 6 | Holder ve su mensaje y decide stakear | PASS | `/preview` renderiza el mensaje según la variante congelada (control/treatment/vip) |
| 7 | Monitor detecta el stake | **PARTIAL** | Detección reescrita y verificada on-chain con tests; la ejecución end-to-end en producción requiere las env vars de Vercel (**E4**) y la migración 002 (**E3**) |
| 8 | Tabla `fes_participants` poblada | PASS | 18 filas insertadas (antes vacía); escritura verificada post-escritura |
| 9 | Atribución vs. gate de 50.000 RIF | **BLOCKED** | La lógica existe y está probada; sin visitas reales no hay atribuciones que medir (hoy: 7 vistas de prueba, 0 atribuciones) |
| 10 | Reporte público en el foro | **BLOCKED** | No publicar con bloqueantes abiertos (cifra, clave rotada, ventana decidida) |

## 2. Criterios de aceptación explícitos del manual

| Requisito (sección) | Estado | Evidencia |
|---|---|---|
| Cada wallet tiene cohorte fija, idempotente ante recargas, persistida en `fes_participants` y consultable **sin Redis** (§4) | PASS | `fesStorage.getParticipant()` es la única fuente de cohorte del camino público; tests de idempotencia del seed |
| Con una transacción de stake real conocida, el monitor la detecta, la asocia a wallet + cohorte y la registra **una sola vez** (§5.4) | **PARTIAL** | Cubierto por tests con fixtures reales (`0x88e85d2d…`, `0x2945dfbc…`); la deduplicación la garantiza `UNIQUE (tx_hash, log_index)` (migración 002). Falta el ensayo vivo en desplegado |
| Cada descarte se registra para auditar falsos positivos (§5.2) | **PARTIAL** | El monitor cuenta `transfersScanned`, `stakeEvents`, `unstakeEvents` y solo persiste lo del piloto; **no** persiste el detalle de cada descarte. Mejora sugerida |
| Avanzar `lastBlock` con confirmaciones (§5.2) | **PARTIAL** | El cursor avanza al bloque actual tras un escaneo exitoso; no implementa esperas de confirmación (riesgo bajo en Rootstock, pero queda explícito) |

## 3. "Debe / No debe" (§8)

| Debe | Estado | No debe | Estado |
|---|---|---|---|
| Asignar cohortes de forma determinista y congelarlas antes de publicar | PASS | Usar el fallback `daysInactive % 2` ni la etiqueta `WHALE` | PASS (eliminados + test que lo impide) |
| Registrar cada participante en `fes_participants` | PASS | Abrir la ventana de 4 semanas antes de cerrar los P0 | PASS (no se publicó nada; gate en BLOCKED) |
| Detectar stake y unstake vía `Transfer` sobre el proxy correcto | PASS (código) · BLOCKED (despliegue) | Buscar un evento `Staked` ni usar la implementación como dirección | PASS (eliminado; se usa el proxy con guard) |
| Contar solo wallets del piloto que **ya vieron su mensaje** | PASS | Contar como atribuido todo RIF que llegue al contrato | PASS (exige vista previa + stake posterior + ventana; test de stake previo a la vista) |
| Mantener auth en el dashboard y en endpoints con datos | PASS | Exponer `wallets.csv`, claves de API ni endpoints abiertos | PASS (S1/S2/N2 corregidos; verificado por gate) |
| Publicar el reporte final en el foro dentro de la ventana | BLOCKED (depende de E2/D1) | Costar nada a la DAO antes de los resultados | N/A (decisión comercial) |

## 4. Fases del plan de ejecución (§7)

| Fase | Contenido | Estado |
|---|---|---|
| **F0** | Diagnóstico y contención sin cambios | PASS (completada; inventario + verificación externa) |
| **F1** | Seguridad S1–S4 y rotación de claves | **PARTIAL**: código corregido; **rotación de la clave The Graph pendiente** (acción externa) |
| **F2** | Entorno y datos E1–E3, G1 | **PARTIAL**: E2 PASS; E1 requiere verificar el bundle desplegado; E3 requiere migrar el cursor (ya migrado en código); G1 no se reproduce |
| **F3** | Cohortes C1–C3 y freeze | PASS (con la reserva de la cifra 16/18/19) |
| **F4** | Monitor M1–M5 y cron | PASS en código; **BLOCKED** en despliegue (env vars + migración) |
| **F5** | Ensayo extremo a extremo con un stake real | **BLOCKED**: requiere despliegue con env vars y fondos/acciones externas |
| **F6** | Corregir la cifra en el foro | **BLOCKED** (acción externa) |
| **F7** | Publicar el enlace (abre la ventana) | **NO INICIAR** con bloqueantes abiertos |

## 5. Supuestos no verificados del manual (§11)

| # | Supuesto | Resultado de la verificación |
|---|---|---|
| 1 | El ABI de StRIFTokenV02 tiene exactamente 10 eventos y ninguno es `Staked` | ✅ **Confirmado** (Blockscout, 10 eventos listados en `FES_EXTERNAL_VERIFICATIONS.md`) |
| 2 | ¿Qué contrato emite el `Transfer` relevante? | ✅ **Confirmado**: el token RIF hacia el proxy; el mint/burn de stRIF ocurre en el propio proxy y se descarta por dirección |
| 3 | Dirección exacta del token RIF | ✅ **Confirmada**: `0x2AcC95758f8b5F583470bA265Eb685a8f45fC9D5` |
| 4 | Umbral mínimo de stake | ❌ **Sin confirmar**: no hay umbral en el código. Cualquier stake cuenta. Definir con Rootstock |
| 5 | La distribución 8/7/1 coincide con el criterio de calificación | ❌ **No coincide con la DB**: la lista congelada tiene 18 wallets. Recalcular contra la cadena antes de publicar |
| 6 | Las vistas de `/preview` quedan registradas con marca de tiempo | ✅ **Confirmado**: evento `preview_view` con `created_at` y canal; la atribución usa la primera vista |
| 7 | Qué parte de `solana-hackathon` debe portarse a `main` | ⚠️ **Parcialmente**: existe merge-base (`ea1ada6`), contra lo que afirma el manual. Inventariar pendientes con el dueño |
| 8 | Estado actual de cada hallazgo (base del 30/09) | ✅ **Actualizado**: ver informe de auditoría §2 |

## 6. Verificación externa exigida (§10)

Cada dato publicable y su fuente quedan en `FES_EXTERNAL_VERIFICATIONS.md`.
Estado resumido: proxy ✅ · implementación ✅ · eventos y topic0 ✅ · token RIF ✅ ·
cohorte ⚠️ (discrepancia) · balances/días ✅ (fixtures) · stakes atribuidos ⚠️
(lógica probada, sin datos reales) · total frente al gate ⚠️ (sin datos reales).

# FES Pilot — Final Report Template (Nov 11, 2026)

> Plantilla del informe final del piloto FES, según el spec del responsable
> del proyecto (oct-2026). Rellenar con los datos de `fes_views`,
> `fes_attributions`, `fes_stake_events`, `fes_pilot_meta` y
> `fes_monitor_state` (migración 002) al cierre de la ventana
> (2026-11-11 08:45 UTC). NO publicar hasta confirmación de Rootstock.

---

## 1. Estado del gap de medición

- **Gap: días 1–7 (oct 14 → oct 21) sin medición operativa**, con evidencia:
  - `fes_stake_events` y `fes_monitor_state` no existían (migración 002 sin aplicar).
  - El monitor de atribución nunca corrió en ese período (cursor vacío).
  - Vistas registradas en `fes_events` (wallet cruda) sin backfill a `fes_views`.
- Acciones de remediación: backfill de vistas (`scripts/fes-backfill-views.mjs`),
  aplicación de la migración 002, primer run del cron de atribución.
- Efecto sobre la medición: los stakes del período **no** quedan atribuidos a
  una vista previa registrada de forma operativa → se reportan como
  **límite inferior** de la conversión, no como el valor final exacto.

## 2. Exposición (población de medición: 18 wallets)

| Métrica | Valor |
|---|---|
| Viewed (de 18) | [N] |
| Not Viewed Yet | [18 − N] |
| Piso de exposición (exposureFloor) | 8 |
| ¿Se cumplió el piso? | sí / no |

Vistas por canal: `rootstock_official [N]` · `forum [N]` · `andromeda [N]` ·
`direct [N]` · `unknown [N]`.

## 3. Conversión por cohorte (con piso de exposición aplicado)

| Cohort | n | Viewed | Staked after | Conversión |
|---|---|---|---|---|
| A (control) | 9 | [N] | [N] | [N]% |
| B (treatment) | 8 | [N] | [N] | [N]% |
| VIP (reportado aparte) | 1 | [N] | [N] | — |

Reglas:
- Conversión = Staked after / Viewed. Protegida contra div-0 (null, no 0%).
- **Si Viewed < exposureFloor: la comparación A/B es inconclusiva** — decirlo
  explícitamente en la conclusión, no maquilar con porcentuales.
- El VIP **no entra al test A/B ni cuenta para el gate de 50.000 RIF**.

## 4. RIF incremental atribuido

| Cohort | RIF atribuido | Nº de stakes atribuidos | Días prom. vista→stake |
|---|---|---|---|
| A | [N] | [N] | [N] |
| B | [N] | [N] | [N] |
| VIP | [N] | [N] | [N] |
| **Total** | **[N]** | **[N]** | [N] |

Fuente: `fes_attributions` (join persistido; regla stakedAt > viewedAt y dentro
de ventana). El RIF de wallets que stakearon sin vista previa **no** se cuenta
como atribuido — va en Limitaciones.

## 5. Desglose por canal

De dónde vinieron las vistas que convirtieron (columna `channel` de
`fes_attributions`), más el desglose total de vistas de la sección 2.

## 6. Estado del monitor (termómetro del sistema)

- Last checked block: [N] (cursor final en `fes_monitor_state`)
- ¿Avanzó en cada hora del piloto? [sí / no — si no, detallar interrupciones]
- Stakes detectados: [N] · Stakes atribuidos: [N]

## 7. Limitaciones

- **Auto-selección**: la distribución es un enlace público; quien entra a
  /preview no es una muestra aleatoria de las 18.
- **Gap de medición días 1–7**: ver sección 1.
- **Tamaño de muestra**: n=18 (A=9, B=8, VIP=1) — cualquier diferencia de
  1 wallet mueve la conversión ~11 puntos porcentuales en A.
- Stakes sin vista previa registrada (ventana anterior al sistema operativo):
  no atribuibles, contados solo en el total on-chain.
- Hash determinista v3 (FES_WALLET_HASH_SALT): la sal no rotó durante la
  ventana [verificar con la alerta hash_not_deterministic antes de publicar].

## 8. Conclusión

Elegir UNA con evidencia de las secciones anteriores:

- [ ] **La hipótesis se sostiene**: conversión de B > A con exposición suficiente.
- [ ] **La hipótesis se refuta**: conversión de B ≤ A con exposición suficiente.
- [ ] **Inconcluso por falta de exposición**: Viewed < exposureFloor al cierre.

## 9. Cifras autoritativas (requieren confirmación de Rootstock antes de publicar)

- Cohorte congelada: **18** wallets (A=9 / B=8 / VIP=1) según DB y snapshot
  IPFS `QmZZpiMZcLmsm3K8ASHaXB3t9Pkdi4ZNsYci7FWTY9ja9b` (verificado byte a
  byte). El manual del piloto decía 16 y el foro sugiere 19: **no publicar
  ninguna cifra hasta que Rootstock confirme y se corrija el foro.**

## 10. Checklist pre-publicación

- [ ] Migración 002 aplicada (fes_views / fes_attributions / fes_pilot_meta / fes_stake_events / fes_monitor_state).
- [ ] Backfill de vistas corrido y verificado (Viewed sin pérdida).
- [ ] Cron de atribución corriendo sin errores ≥ 48h antes del cierre.
- [ ] Sin alertas `monitor_stalled` ni `hash_not_deterministic` abiertas.
- [ ] Variables de entorno en Vercel: FES_WALLET_HASH_SALT, CRON_SECRET, STAKING_CONTRACT_ADDRESS, RIF_TOKEN_ADDRESS, BLOCKSCOUT_API_KEY (sin ella el acceso anónimo a Blockscout responde 429 y el cron no escanea — clave gratis en https://dev.blockscout.com).
- [ ] Cifra de participantes confirmada por Rootstock y foro corregido.
- [ ] Condiciones económicas definidas ($11.200 / $3.600) — no incluir en el informe sin decisión.

# FES Pilot — Entorno

## Variables de entorno requeridas

### En .env (ya existentes)
| Variable | Valor (ejemplo) | Propósito |
|---|---|---|
| `THEGRAPH_API_KEY` | `6ba71d4c...` | Gateway The Graph |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://*.supabase.co` | Conexión Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` | Clave anónima Supabase |

### Variables adicionales (opcionales, con defaults)
Agregar a `.env` si se requiere customización:

```env
# Rewards Subgraph ID (default: Rewards Subgraph de Rootstock Collective)
REWARDS_SUBGRAPH_ID=7kSWmHvWixeZBpzVfgkGS2sYNYoXZz614TcqnPTgkWwA

# RIF Token contract (default: RSK mainnet)
RIF_TOKEN_ADDRESS=0x2AcC95758f8b5F583470bA265Eb685a8f45fC9D5

# Thresholds de detección
RIF_MIN_BALANCE=500
RIF_MIN_DAYS_INACTIVE=30

# Tracking (default: 10 bloques)
FES_REACTIVATION_BLOCK_DELTA=10
```

## Creación de tablas en Supabase

1. Ir a [Supabase Dashboard](https://supabase.com) → proyecto `lhdtjronlottzhhhatzb`
2. Abrir **SQL Editor**
3. Copiar y pegar el contenido de `supabase/migrations/001_create_fes_tables.sql`
4. Ejecutar

Alternativa vía Supabase CLI:
```bash
npx supabase db push
```

## Inicio del servidor

```bash
npm run dev
# → http://localhost:3000
```

## Prueba E2E

```bash
# 1. Detección + cohortes + mensajes
curl http://localhost:3000/api/fes/metrics | jq '.count, .cohorts'

# 2. Tracking cycle
curl -X POST http://localhost:3000/api/fes/track \
  -H 'Content-Type: application/json' -d '{}' | jq '{checked, reactivated}'

# 3. Participantes
curl http://localhost:3000/api/fes/participants | jq '.total, .participants[0:2]'

# 4. Preview
open http://localhost:3000/preview
```

## Simular reactivación

```sql
-- En Supabase SQL Editor, asignar checkpoint manual:
UPDATE fes_participants
SET last_block_checkpoint = 1,
    message_sent_at = NOW(),
    message_language = 'en'
WHERE wallet = '0xac31a4beedd7ec916b7a48a612230cb85c1aaf56';
```

```bash
# Verificar
curl -X POST http://localhost:3000/api/fes/track \
  -H 'Content-Type: application/json' \
  -d '{"wallet":"0xac31a4beedd7ec916b7a48a612230cb85c1aaf56"}' | jq '.'

curl http://localhost:3000/api/fes/participants | jq '.participants[] | select(.wallet == "0xac31a4beedd7ec916b7a48a612230cb85c1aaf56")'
```

## Errores conocidos del entorno

| Error | Causa | Impacto |
|---|---|---|
| `Supabase usando URL placeholder` | `NEXT_PUBLIC_SUPABASE_URL` no disponible en build | FES storage no funciona |
| `getaddrinfo ENOTFOUND redis-11662...` | Redis cloud no accesible | Caché Redis no disponible (fallback a Map en memoria) |
| `PERMISSION_DENIED unknown_token` | Token Yellowstone inválido | Solo Solana streaming, no afecta FES |
# Deploy trigger lun 20 jul 2026 12:55:09 -04

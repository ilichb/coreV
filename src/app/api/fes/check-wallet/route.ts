/**
 * POST /api/fes/check-wallet
 *
 * Endpoint público para que un holder verifique su estado en el FES pilot.
 *
 * Recibe: { wallet: "0x...", src?, referrer? }
 * Responde: { found, inPilot, cohort, message, yieldProjection, viewLogged }
 *
 * C1 — La cohorte se resuelve SOLO desde `fes_participants` (lista congelada).
 * Antes se calculaba en vivo con `cohortAssignmentService.getCohort()`, que
 * re-asignaba cohortes desde cero con una heurística alternativa
 * (`daysInactive % 2`) cuando el subgraph fallaba: dos wallets podían recibir
 * cohortes distintas según el momento de la consulta, y una wallet fuera de la
 * lista podía colarse en el experimento. Ahora una wallet no congelada recibe
 * "not in pilot" y el endpoint no toca el subgraph ni la RPC pública.
 *
 * NO expone datos de otros holders — solo la información de la wallet consultada.
 * Las wallets se devuelven hasheadas (walletHash) en lugar de la address cruda.
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildMessage } from '@/lib/services/rootstock/message-templates';
import { yieldProjectionService } from '@/lib/services/rootstock/yield-projection.service';
import { fesStorage, type MessageVariant } from '@/lib/services/rootstock/fes-storage.service';
import { fesViewLogger } from '@/lib/services/rootstock/fes-view-logger.service';
import { resolveChannel } from '@/lib/services/rootstock/fes-channels';
import { walletHashService } from '@/lib/services/security/wallet-hash.service';
import { rateLimit, clientIp } from '@/lib/security/rate-limit';

// Límite por IP: 30 consultas/min. Suficiente para una persona probando su
// wallet; insuficiente para enumerar la lista congelada desde una sola IP.
const RATE_LIMIT = { limit: 30, windowMs: 60_000 };

export async function POST(request: NextRequest) {
    try {
        const limiter = rateLimit(`fes:check-wallet:${clientIp(request.headers)}`, RATE_LIMIT.limit, RATE_LIMIT.windowMs);
        if (!limiter.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Try again shortly.' },
                { status: 429, headers: { 'Retry-After': String(limiter.retryAfterSec) } }
            );
        }

        const body = await request.json();
        const wallet = (body.wallet || '').trim().toLowerCase();
        // Canal por el que llegó. Prioridad: ?src= válido → dominio del
        // referrer → direct. Se resuelve acá para que lo persistido ya sea un
        // valor de la lista, y el cliente no tenga que conocer el mapeo.
        const channel = resolveChannel(body.src, body.referrer);

        if (!wallet || !/^0x[a-f0-9]{40}$/.test(wallet)) {
            return NextResponse.json(
                { error: 'Invalid wallet address. Expected 0x-prefixed 40-char hex string.' },
                { status: 400 }
            );
        }

        // 1. Cohorte autoritativa: lista congelada del piloto.
        const participant = await fesStorage.getParticipant(wallet);

        if (!participant) {
            return NextResponse.json({
                found: false,
                inPilot: false,
                wallet: walletHashService.hashWalletDeterministic(wallet).walletHash,
                message:
                    'This wallet is not part of the FES pilot cohort. Only the wallets selected ' +
                    'in the frozen snapshot are eligible for the experiment.',
            });
        }

        const balance = Number(participant.balance_at_detection);
        const daysInactive = participant.days_inactive_at_detection;
        // La columna se llama last_block_* pero guarda el timestamp (unix, s)
        // de la última actividad de staking detectada en el seed.
        const lastStakeActivity = new Date(Number(participant.last_block_at_detection) * 1000);

        // 2. Proyección de rendimiento sobre los datos congelados.
        const yieldProjection = await yieldProjectionService.calculate(balance, daysInactive);

        // 3. Mensaje según la variante congelada del participante.
        const variant = participant.message_variant as MessageVariant;

        const message = buildMessage(
            {
                wallet,
                balance,
                daysInactive,
                lastStakeActivity: lastStakeActivity.toISOString().split('T')[0],
                projectedYield: yieldProjection.projectedYieldRIF,
                recommendedBuilders: yieldProjection.recommendedBuilders,
            },
            variant,
            'en' // Default language, could be extended with Accept-Language header
        );

        // 4. Registrar la vista en `fes_views` (Supabase) — la fuente del
        // embudo Viewed → Staked. El spec del piloto pide walletHash
        // DETERMINISTA (v3): el join con fes_attributions se hace por hash, y
        // una sal no determinista rompería la atribución en cada reinicio
        // (alerta #3 del dashboard). El referrer crudo se guarda truncado; el
        // canal ya viene resuelto por resolveChannel.
        // El resultado se refleja en `viewLogged`: antes devolvía `true` fijo
        // aunque el INSERT fuera rechazado por RLS, así que la UI reportaba
        // éxito en un log que nunca ocurrió.
        let viewLogged = false;
        try {
            await fesStorage.recordView({
                wallet_hash: walletHashService.hashWalletDeterministic(wallet).walletHash,
                cohort: participant.cohort,
                message_variant: variant,
                channel,
                referrer: typeof body.referrer === 'string' && body.referrer
                    ? String(body.referrer).slice(0, 255)
                    : null,
                balance_rif: balance,
                days_inactive: daysInactive,
            });
            viewLogged = true;
        } catch (err) {
            console.error('[FES] recordView failed:', err);
        }

        // 5. Loguear la vista en MongoDB (para reportes diarios + IPFS)
        // Fire-and-forget: no bloquea la respuesta
        fesViewLogger.logView({
            wallet,
            cohort: participant.cohort,
            messageVariant: variant,
            balance,
            daysInactive,
            projectedYield: yieldProjection.projectedYieldRIF,
            channel,
        }).catch(err => console.error('[FES View Logger] Background log failed:', err));

        // 6. Respuesta — solo datos de esta wallet, hasheada
        return NextResponse.json({
            found: true,
            inPilot: true,
            wallet: walletHashService.hashWalletDeterministic(wallet).walletHash,
            cohort: participant.cohort,
            balance,
            daysInactive,
            lastStakeActivity: lastStakeActivity.toISOString().split('T')[0],
            message: {
                subject: message.subject,
                body: message.body,
                variant: message.variant,
            },
            yieldProjection: {
                projectedYieldRIF: yieldProjection.projectedYieldRIF,
                aprUsed: yieldProjection.aprUsed,
                recommendedBuilders: yieldProjection.recommendedBuilders,
            },
            viewLogged,
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: 'Failed to check wallet', detail: error.message },
            { status: 500 }
        );
    }
}

/**
 * POST /api/fes/check-wallet
 *
 * Endpoint público para que un holder verifique su estado en el FES pilot.
 *
 * Recibe: { wallet: "0x..." }
 * Responde: { found, cohort, message, yieldProjection, viewLogged }
 *
 * NO expone datos de otros holders — solo la información de la wallet consultada.
 * Las wallets se devuelven hasheadas (walletHash) en lugar de la address cruda.
 */

import { NextRequest, NextResponse } from 'next/server';
import { inactiveHolderService } from '@/lib/services/rootstock/inactive-holder.service';
import { cohortAssignmentService } from '@/lib/services/rootstock/cohort-assignment.service';
import { buildMessage, type MessageVariant } from '@/lib/services/rootstock/message-templates';
import { yieldProjectionService } from '@/lib/services/rootstock/yield-projection.service';
import { fesStorage } from '@/lib/services/rootstock/fes-storage.service';
import { walletHashService } from '@/lib/services/security/wallet-hash.service';

function toDateStr(v: Date | string): string {
    if (typeof v === 'string') return v.split('T')[0];
    return v.toISOString().split('T')[0];
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const wallet = (body.wallet || '').trim().toLowerCase();

        if (!wallet || !/^0x[a-f0-9]{40}$/.test(wallet)) {
            return NextResponse.json(
                { error: 'Invalid wallet address. Expected 0x-prefixed 40-char hex string.' },
                { status: 400 }
            );
        }

        // 1. Verificar si el holder está en la lista de inactivos
        const activity = await inactiveHolderService.getHolderActivity(wallet);

        if (!activity) {
            return NextResponse.json({
                found: false,
                wallet: walletHashService.hashWallet(wallet).walletHash,
                message: 'No inactive staking position found for this wallet. You may be actively staking or have never staked.',
            });
        }

        // 2. Obtener cohorte
        const cohortInfo = await cohortAssignmentService.getCohort(wallet);

        if (!cohortInfo) {
            return NextResponse.json({
                found: true,
                wallet: walletHashService.hashWallet(wallet).walletHash,
                message: 'Staking position detected but could not be assigned to a cohort.',
                balance: activity.balance,
                daysInactive: activity.daysInactive,
            });
        }

        // 3. Calcular proyección de rendimiento
        const yieldProjection = await yieldProjectionService.calculate(
            activity.balance,
            activity.daysInactive
        );

        // 4. Generar mensaje según cohorte
        const variantMap: Record<string, MessageVariant> = {
            'A': 'control',
            'B': 'treatment',
            'WHALE': 'vip',
        };

        const variant = variantMap[cohortInfo.cohort] || 'control';

        const message = buildMessage(
            {
                wallet,
                balance: activity.balance,
                daysInactive: activity.daysInactive,
                lastStakeActivity: toDateStr(activity.lastStakeActivity),
                projectedYield: yieldProjection.projectedYieldRIF,
                recommendedBuilders: yieldProjection.recommendedBuilders,
            },
            variant,
            'en' // Default language, could be extended with Accept-Language header
        );

        // 5. Loguear la vista en fes_events
        await fesStorage.recordEvent({
            wallet,
            event_type: 'preview_view',
            payload: {
                cohort: cohortInfo.cohort,
                message_variant: variant,
                balance: activity.balance,
                daysInactive: activity.daysInactive,
                projectedYield: yieldProjection.projectedYieldRIF,
                timestamp: new Date().toISOString(),
            },
        });

        // 6. Respuesta — solo datos de esta wallet, hasheada
        return NextResponse.json({
            found: true,
            wallet: walletHashService.hashWallet(wallet).walletHash,
            cohort: cohortInfo.cohort,
            balance: activity.balance,
            daysInactive: activity.daysInactive,
            lastStakeActivity: toDateStr(activity.lastStakeActivity),
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
            viewLogged: true,
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: 'Failed to check wallet', detail: error.message },
            { status: 500 }
        );
    }
}

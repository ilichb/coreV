/**
 * generate-pilot-report.ts
 *
 * Script que genera el reporte final del FES Pilot consolidando datos de:
 *   - Supabase (fes_participants, fes_events)
 *   - MongoDB (fes_views, fes_attributions, fes_daily_reports)
 *   - IPFS (reportes diarios publicados)
 *
 * Uso:
 *   npx ts-node --esm scripts/generate-pilot-report.ts
 *
 * Output:
 *   - docs/reports/fes-pilot-report-{YYYY-MM-DD}.md  (reporte en markdown)
 *   - Publicación a IPFS vía Pinata (opcional con --publish)
 *
 * Flags:
 *   --publish   Publica el reporte a IPFS
 *   --output    Ruta de salida (default: docs/reports/)
 */

import { fesStorage } from '../src/lib/services/rootstock/fes-storage.service';
import { fesViewLogger } from '../src/lib/services/rootstock/fes-view-logger.service';
import { fesAttributionMonitor } from '../src/lib/services/rootstock/fes-attribution-monitor.service';
import { inactiveHolderService } from '../src/lib/services/rootstock/inactive-holder.service';
import { mongoDBClient } from '../src/lib/infrastructure/mongodb';
import { pinata } from '../src/lib/services/storage/pinata';
import * as fs from 'fs';
import * as path from 'path';

interface PilotReport {
    generatedAt: string;
    period: {
        start: string;
        end: string;
        daysElapsed: number;
    };
    participants: {
        total: number;
        byCohort: Record<string, number>;
        byVariant: Record<string, number>;
        contacted: number;
        reactivated: number;
        conversionRate: number;
        avgDaysToReactivate: number | null;
        cohortMetrics: Array<{
            cohort: string;
            total: number;
            contacted: number;
            reactivated: number;
            rate: number;
            avgDaysToReactivate: number | null;
        }>;
    };
    views: {
        totalViews: number;
        uniqueWallets: number;
        viewsByCohort: Record<string, number>;
        viewsByDate: Record<string, number>;
        lastPublishedReport: string | null;
        publishedReports: number;
    };
    attributions: {
        totalAttributions: number;
        byCohort: Record<string, number>;
        totalVolumeRIF: number;
        volumeByCohort: Record<string, number>;
        avgDaysToStake: number | null;
        lastCheckedBlock: number;
    };
    inactiveHolders: {
        totalDetected: number;
        minBalanceRIF: number;
        minDaysInactive: number;
        cutoffDate: string;
    };
    events: {
        total: number;
        byType: Record<string, number>;
    };
}

async function generateReport(): Promise<PilotReport> {
    const now = new Date();

    // ── Participantes (Supabase) ──────────────────────────────────────────
    const allParticipants = await fesStorage.listParticipants();
    const contacted = allParticipants.filter(p => p.message_sent_at !== null);
    const reactivated = contacted.filter(p => p.reactivated);

    const byCohort: Record<string, number> = {};
    const byVariant: Record<string, number> = {};
    for (const p of allParticipants) {
        byCohort[p.cohort] = (byCohort[p.cohort] || 0) + 1;
        byVariant[p.message_variant] = (byVariant[p.message_variant] || 0) + 1;
    }

    const cohortMetrics = (['A', 'B', 'VIP'] as const).map(cohort => {
        const inCohort = contacted.filter(p => p.cohort === cohort);
        const react = inCohort.filter(p => p.reactivated);
        const avgDays = react.length > 0
            ? react.reduce((s, p) => {
                const sent = new Date(p.message_sent_at!).getTime();
                const reactAt = new Date(p.reactivated_at!).getTime();
                return s + (reactAt - sent) / 86400000;
            }, 0) / react.length
            : null;

        return {
            cohort,
            total: allParticipants.filter(p => p.cohort === cohort).length,
            contacted: inCohort.length,
            reactivated: react.length,
            rate: inCohort.length > 0 ? react.length / inCohort.length : 0,
            avgDaysToReactivate: avgDays,
        };
    });

    const totalReactivated = reactivated.length;
    const allAvgDays = totalReactivated > 0
        ? reactivated.reduce((s, p) => {
            const sent = new Date(p.message_sent_at!).getTime();
            const reactAt = new Date(p.reactivated_at!).getTime();
            return s + (reactAt - sent) / 86400000;
        }, 0) / totalReactivated
        : null;

    // ── Eventos (Supabase) ────────────────────────────────────────────────
    const allEvents = await fesStorage.getEvents();
    const byType: Record<string, number> = {};
    for (const e of allEvents) {
        byType[e.event_type] = (byType[e.event_type] || 0) + 1;
    }

    // ── Vistas (MongoDB) ──────────────────────────────────────────────────
    const viewStats = await fesViewLogger.getAggregatedStats();
    const publishedReports = await fesViewLogger.getPublishedReports(100);

    // ── Atribuciones (MongoDB) ────────────────────────────────────────────
    const attributionSummary = await fesAttributionMonitor.getSummary();

    // ── Holders inactivos ─────────────────────────────────────────────────
    const holdersResult = await inactiveHolderService.findInactiveHolders();

    // ── Período ───────────────────────────────────────────────────────────
    const dates = allParticipants
        .map(p => new Date(p.created_at).getTime())
        .filter(t => !isNaN(t))
        .sort();

    const startDate = dates.length > 0 ? new Date(dates[0]) : now;
    const daysElapsed = Math.floor((now.getTime() - startDate.getTime()) / 86400000);

    return {
        generatedAt: now.toISOString(),
        period: {
            start: startDate.toISOString().split('T')[0],
            end: now.toISOString().split('T')[0],
            daysElapsed,
        },
        participants: {
            total: allParticipants.length,
            byCohort,
            byVariant,
            contacted: contacted.length,
            reactivated: totalReactivated,
            conversionRate: contacted.length > 0 ? totalReactivated / contacted.length : 0,
            avgDaysToReactivate: allAvgDays,
            cohortMetrics,
        },
        views: {
            totalViews: viewStats.totalViews,
            uniqueWallets: viewStats.uniqueWallets,
            viewsByCohort: viewStats.viewsByCohort,
            viewsByDate: viewStats.viewsByDate,
            lastPublishedReport: viewStats.lastPublishedReport,
            publishedReports: publishedReports.length,
        },
        attributions: {
            totalAttributions: attributionSummary.totalAttributions,
            byCohort: attributionSummary.byCohort,
            totalVolumeRIF: attributionSummary.totalVolumeRIF,
            volumeByCohort: attributionSummary.volumeByCohort,
            avgDaysToStake: attributionSummary.avgDaysToStake,
            lastCheckedBlock: attributionSummary.lastCheckedBlock,
        },
        inactiveHolders: {
            totalDetected: holdersResult.count,
            minBalanceRIF: holdersResult.metadata.minBalanceRIF,
            minDaysInactive: holdersResult.metadata.minDaysInactive,
            cutoffDate: holdersResult.metadata.cutoffDate,
        },
        events: {
            total: allEvents.length,
            byType,
        },
    };
}

function formatReport(report: PilotReport): string {
    const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
    const fmtRIF = (n: number) => `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} RIF`;

    return `# FES Pilot — Reporte Final

> Generado: ${new Date(report.generatedAt).toLocaleString('es-ES', { timeZone: 'UTC' })} UTC
> Período: ${report.period.start} → ${report.period.end} (${report.period.daysElapsed} días)

---

## 1. Resumen Ejecutivo

| Métrica | Valor |
|---|---|
| **Participantes detectados** | ${report.participants.total} |
| **Contactados (mensaje enviado)** | ${report.participants.contacted} |
| **Reactivados** | ${report.participants.reactivated} |
| **Tasa de conversión** | ${pct(report.participants.conversionRate)} |
| **Vistas de /preview** | ${report.views.totalViews} (${report.views.uniqueWallets} wallets únicas) |
| **Atribuciones de stake** | ${report.attributions.totalAttributions} |
| **Volumen atribuido** | ${fmtRIF(report.attributions.totalVolumeRIF)} |
| **Holders inactivos detectados** | ${report.inactiveHolders.totalDetected} |

---

## 2. Participantes por Cohorte

| Cohorte | Total | Contactados | Reactivados | Tasa | Días promedio |
|---|---|---|---|---|---|
${report.participants.cohortMetrics.map(c =>
        `| **${c.cohort}** | ${c.total} | ${c.contacted} | ${c.reactivated} | ${pct(c.rate)} | ${c.avgDaysToReactivate !== null ? c.avgDaysToReactivate.toFixed(1) : 'N/A'} |`
    ).join('\n')}

| **Total** | ${report.participants.total} | ${report.participants.contacted} | ${report.participants.reactivated} | ${pct(report.participants.conversionRate)} | ${report.participants.avgDaysToReactivate !== null ? report.participants.avgDaysToReactivate.toFixed(1) : 'N/A'} |

### Distribución por variante de mensaje

| Variante | Cantidad |
|---|---|
${Object.entries(report.participants.byVariant).map(([k, v]) => `| **${k}** | ${v} |`).join('\n')}

---

## 3. Vistas de /preview

| Métrica | Valor |
|---|---|
| **Total de vistas** | ${report.views.totalViews} |
| **Wallets únicas** | ${report.views.uniqueWallets} |
| **Reportes diarios publicados a IPFS** | ${report.views.publishedReports} |
| **Último reporte IPFS** | ${report.views.lastPublishedReport || 'Ninguno'} |

### Vistas por cohorte

| Cohorte | Vistas |
|---|---|
${Object.entries(report.views.viewsByCohort).map(([k, v]) => `| **${k}** | ${v} |`).join('\n')}

### Vistas por fecha (últimos 30 días)

| Fecha | Vistas |
|---|---|
${Object.entries(report.views.viewsByDate).slice(0, 30).map(([k, v]) => `| ${k} | ${v} |`).join('\n')}

---

## 4. Atribuciones de Stake

| Métrica | Valor |
|---|---|
| **Total de atribuciones** | ${report.attributions.totalAttributions} |
| **Volumen total** | ${fmtRIF(report.attributions.totalVolumeRIF)} |
| **Días promedio para stake** | ${report.attributions.avgDaysToStake !== null ? report.attributions.avgDaysToStake.toFixed(1) : 'N/A'} |
| **Último bloque verificado** | ${report.attributions.lastCheckedBlock} |

### Atribuciones por cohorte

| Cohorte | Atribuciones | Volumen |
|---|---|---|
${Object.entries(report.attributions.byCohort).map(([k, v]) =>
        `| **${k}** | ${v} | ${fmtRIF(report.attributions.volumeByCohort[k] || 0)} |`
    ).join('\n')}

---

## 5. Holders Inactivos Detectados

| Métrica | Valor |
|---|---|
| **Total detectados** | ${report.inactiveHolders.totalDetected} |
| **Balance mínimo** | ${report.inactiveHolders.minBalanceRIF} RIF |
| **Días mínimo de inactividad** | ${report.inactiveHolders.minDaysInactive} |
| **Corte de fecha** | ${report.inactiveHolders.cutoffDate} |

---

## 6. Eventos Registrados

| Tipo de evento | Cantidad |
|---|---|
${Object.entries(report.events.byType).sort((a, b) => b[1] - a[1]).map(([k, v]) => `| **${k}** | ${v} |`).join('\n')}

| **Total** | ${report.events.total} |

---

## 7. Conclusiones

${report.participants.total === 0
            ? 'El piloto no registró participantes. Verificar configuración de detección de holders inactivos.'
            : `Se detectaron **${report.participants.total}** participantes inactivos, de los cuales **${report.participants.contacted}** fueron contactados. 
**${report.participants.reactivated}** reactivaron su staking (${pct(report.participants.conversionRate)} de conversión).

${report.attributions.totalAttributions > 0
                ? `Se atribuyeron **${report.attributions.totalAttributions}** stakes al experimento, con un volumen total de **${fmtRIF(report.attributions.totalVolumeRIF)}**.`
                : 'No se detectaron atribuciones de stake durante el período del piloto.'}

${report.views.totalViews > 0
                ? `La página /preview recibió **${report.views.totalViews}** vistas de **${report.views.uniqueWallets}** wallets únicas.`
                : 'La página /preview no registró vistas.'}`
        }

---

## 8. Datos Técnicos

- **Versión del reporte**: fes-pilot-report-v1
- **Generado por**: scripts/generate-pilot-report.ts
- **Fuentes**: Supabase (participantes, eventos), MongoDB (vistas, atribuciones), Rewards Subgraph (holders)
`;
}

async function main() {
    const args = process.argv.slice(2);
    const shouldPublish = args.includes('--publish');
    const outputDir = args.includes('--output')
        ? args[args.indexOf('--output') + 1]
        : 'docs/reports';

    console.log('📊 Generating FES Pilot report...');

    try {
        const report = await generateReport();
        const markdown = formatReport(report);

        // Guardar archivo
        const dateStr = new Date().toISOString().split('T')[0];
        const outputPath = path.join(outputDir, `fes-pilot-report-${dateStr}.md`);
        fs.mkdirSync(outputDir, { recursive: true });
        fs.writeFileSync(outputPath, markdown, 'utf-8');

        console.log(`✅ Report saved to ${outputPath}`);

        // Publicar a IPFS si se solicita
        if (shouldPublish) {
            console.log('📡 Publishing report to IPFS...');
            try {
                const result = await pinata.pinJSON(report, {
                    name: `fes-pilot-report-${dateStr}.json`,
                });
                console.log(`✅ Report published to IPFS: https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`);
            } catch (err: any) {
                console.error('❌ Failed to publish to IPFS:', err.message);
            }
        }

        // Mostrar resumen en consola
        console.log('\n📋 Resumen:');
        console.log(`  Participantes: ${report.participants.total}`);
        console.log(`  Contactados: ${report.participants.contacted}`);
        console.log(`  Reactivados: ${report.participants.reactivated}`);
        console.log(`  Tasa de conversión: ${(report.participants.conversionRate * 100).toFixed(1)}%`);
        console.log(`  Vistas /preview: ${report.views.totalViews}`);
        console.log(`  Atribuciones: ${report.attributions.totalAttributions}`);
        console.log(`  Volumen atribuido: ${report.attributions.totalVolumeRIF.toFixed(2)} RIF`);

    } catch (error: any) {
        console.error('❌ Error generating report:', error);
        process.exit(1);
    } finally {
        await mongoDBClient.disconnect();
    }
}

main();

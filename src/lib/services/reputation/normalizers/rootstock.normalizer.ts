/**
 * @file rootstock.normalizer.ts
 * @location src/lib/services/reputation/normalizers/rootstock.normalizer.ts
 *
 * Traduce la data cruda del Rootstock Connector (subgraph de rewards +
 * governance on-chain) al payload estándar AVIPNormalizedInput (0..100).
 *
 * Basado en la misma lógica que atlas-ingestion.service.ts usa correctamente,
 * adaptada a los campos que produce getBuilderScorecard().
 */

import {
  IEcosystemNormalizer,
  AVIPNormalizedInput,
  defaultAVIPInput,
} from '../ecosystem-normalizer.interface';
import { logger } from '../../../utils/logger';

/** Data cruda que llega desde getBuilderScorecard() del RootstockConnector */
export interface RootstockRawData {
  /** Staking total en wei/rBTC (float ya parseado) */
  totalStaked:       number;
  /** Propuestas on-chain del builder como proposer */
  onChainProposals:  Array<{ id: string; forVotes: string; againstVotes: string; status?: string }>;
  /** Votos emitidos por el builder como voter */
  onChainVotes:      Array<{ id: string; support?: boolean }>;
  /** Número de gauges activos en staking */
  gaugeCount:        number;
  /** Tiempo acumulado en el ecosistema (segundos, del subgraph) */
  accumulatedTime:   number;
}

export class RootstockNormalizer implements IEcosystemNormalizer<RootstockRawData> {
  readonly ecosystem = 'rootstock';

  normalize(raw: RootstockRawData): AVIPNormalizedInput {
    try {
      // ── GOVERNANCE (0..100) ─────────────────────────────────────────────
      // Mismo patrón que atlas-ingestion: participación real + outcome + evidencia
      const proposalCount  = raw.onChainProposals.length;
      const voteCount      = raw.onChainVotes.length;

      // Participation ratio: cada propuesta vale hasta 20pts (cap 60), votos cap 30
      const proposalScore  = Math.min(proposalCount * 20, 60);
      const voteScore      = Math.min(voteCount * 5, 30);
      // 10pts bonus si hay actividad combinada (no solo proponer o solo votar)
      const activityBonus  = (proposalCount > 0 && voteCount > 0) ? 10 : 0;
      const governanceScore = Math.min(100, proposalScore + voteScore + activityBonus);

      // ── TECHNICAL (0..100) ──────────────────────────────────────────────
      // Rootstock no expone commits directamente — aproximamos por:
      // gauges activos (diversidad técnica) + tiempo en ecosistema
      const gaugeDiversity = Math.min(raw.gaugeCount * 15, 45);
      const daysInEcosystem = Math.floor(raw.accumulatedTime / 86400);
      const tenureScore     = Math.min(daysInEcosystem / 2, 40);  // cap 40pts
      // Bonus por staking significativo (señal de compromiso técnico/económico)
      const stakingSignal   = raw.totalStaked > 1e15 ? 15 : raw.totalStaked > 0 ? 8 : 0;
      const technicalScore  = Math.min(100, gaugeDiversity + tenureScore + stakingSignal);

      // ── COMMUNITY (0..100) ──────────────────────────────────────────────
      // Staking como señal de compromiso económico con la comunidad
      // Usamos escala logarítmica para evitar inflación por ballenas
      const stakingInRBTC  = raw.totalStaked / 1e18;
      const stakingPts     = stakingInRBTC > 0
        ? Math.min(Math.log10(stakingInRBTC + 1) * 20, 50)
        : 0;
      // Votos como señal de participación comunitaria
      const communityVotes  = Math.min(voteCount * 3, 30);
      const communityScore  = Math.min(100, Math.round(stakingPts + communityVotes + 20));

      // ── EVIDENCE ────────────────────────────────────────────────────────
      const verifiedCount   = proposalCount + (raw.gaugeCount > 0 ? 1 : 0);
      const totalMilestones = proposalCount;

      return {
        technical:       Math.round(technicalScore),
        governance:      Math.round(governanceScore),
        community:       Math.round(communityScore),
        verifiedCount,
        totalMilestones,
      };

    } catch (err: any) {
      logger.error(`[RootstockNormalizer] Error normalizing data: ${err.message}`);
      return defaultAVIPInput();
    }
  }
}

export const rootstockNormalizer = new RootstockNormalizer();

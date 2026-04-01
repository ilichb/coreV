import { logger } from '../../utils/logger';

export interface AVIPScore {
    total: number;      // 0..100
    technical: number;
    governance: number;
    community: number;
    behavioralConfidence: number; // 0..1
    isAnomaly: boolean;
    decayedAt: string;   // ISO timestamp
}

export class ReputationEngineService {
    // Constants from Core Paper v3.1
    private readonly LAMBDA_POS = 0.001;   // positive events decay
    private readonly LAMBDA_NEG = 0.003;   // negative events (3x faster)
    private readonly ENTROPY_THRESHOLD = 3.8;
    private readonly MIN_CONFIDENCE = 0.1;

    // Weights
    private readonly TECH_WEIGHT = 0.5;
    private readonly GOV_WEIGHT = 0.3;
    private readonly COM_WEIGHT = 0.2;

    /**
     * Calculates the AVIP v2.0 reputation score for a builder or project.
     */
    async calculateScore(data: any): Promise<AVIPScore> {
        try {
            // 1. Behavioral confidence (Sigmoid of anomaly score)
            const anomalyScore = this.detectAnomalies(data);
            const behavioralConfidence = this.sigmoid(2 - anomalyScore); // Simplified mapping
            
            // 2. Multidimensional score calculation
            const technical = this.calculateDimensionScore(data.technical || 0, this.LAMBDA_POS);
            const governance = this.calculateDimensionScore(data.governance || 0, this.LAMBDA_POS);
            const community = this.calculateDimensionScore(data.community || 0, this.LAMBDA_POS);

            // 3. Weighting with confidence squared
            const confidenceFactor = Math.pow(behavioralConfidence, 2);
            const cSquare = Math.max(confidenceFactor, this.MIN_CONFIDENCE);

            const baseTotal = (technical * this.TECH_WEIGHT) + 
                              (governance * this.GOV_WEIGHT) + 
                              (community * this.COM_WEIGHT);
            
            const total = Math.min(100, Math.max(0, baseTotal * cSquare));

            return {
                total: parseFloat(total.toFixed(2)),
                technical: parseFloat(technical.toFixed(2)),
                governance: parseFloat(governance.toFixed(2)),
                community: parseFloat(community.toFixed(2)),
                behavioralConfidence: parseFloat(behavioralConfidence.toFixed(4)),
                isAnomaly: anomalyScore > this.ENTROPY_THRESHOLD,
                decayedAt: new Date().toISOString()
            };
        } catch (error) {
            logger.error('❌ Error calculating reputation score', { error });
            return this.getDefaultScore();
        }
    }

    private calculateDimensionScore(baseScore: number, lambda: number): number {
        // R(t) = R0 * exp(-λ * t)
        // Simplified for immediate calculation; real implementation would use t = current - last_event
        return baseScore; // Placeholder for time-series decay
    }

    private detectAnomalies(data: any): number {
        // H(X) = - Σ p(x) * log2(p(x))
        // Placeholder for Shannon entropy calculation
        return 2.5; // Healthy default
    }

    private sigmoid(z: number): number {
        return 1 / (1 + Math.exp(-z));
    }

    private getDefaultScore(): AVIPScore {
        return {
            total: 0,
            technical: 0,
            governance: 0,
            community: 0,
            behavioralConfidence: 1,
            isAnomaly: false,
            decayedAt: new Date().toISOString()
        };
    }
}

export const reputationEngineService = new ReputationEngineService();

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI!;

function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

function calculateDimensionScore(baseScore: number, lambda: number = 0.001): number {
  return baseScore * Math.exp(-lambda * 0);
}

function detectAnomalies(data: any): number {
  const events = [data.technical||0, data.governance||0, data.community||0, data.verifiedCount||0]
    .filter(v => v > 0);
  if (events.length === 0) return 2.5;
  const total = events.reduce((s, v) => s + v, 0);
  const probs = events.map(v => v / total);
  const entropy = -probs.reduce((s, p) => s + (p > 0 ? p * Math.log2(p) : 0), 0);
  const maxEntropy = Math.log2(events.length);
  return parseFloat(((maxEntropy > 0 ? entropy / maxEntropy : 0) * 4).toFixed(3));
}

function calculateAVIP(data: any) {
  const anomalyScore = detectAnomalies(data);
  const behavioralConfidence = sigmoid(2 - anomalyScore);
  const technical = calculateDimensionScore(data.technical || 0);
  const governance = calculateDimensionScore(data.governance || 0);
  const community = calculateDimensionScore(data.community || 0);
  const confidenceFactor = 0.7 + (0.3 * behavioralConfidence);
  const baseTotal = (technical * 0.5) + (governance * 0.3) + (community * 0.2);
  const total = Math.min(100, Math.max(0, baseTotal * confidenceFactor));
  return {
    total: parseFloat(total.toFixed(2)),
    technical: parseFloat(technical.toFixed(2)),
    governance: parseFloat(governance.toFixed(2)),
    community: parseFloat(community.toFixed(2)),
    behavioralConfidence: parseFloat(behavioralConfidence.toFixed(4)),
    isAnomaly: anomalyScore > 3.8,
    decayedAt: new Date().toISOString()
  };
}

function extractMetrics(doc: any) {
  const src = doc.sourceScorecard || {};
  const votesFor = Number(src.votes_for || 0);
  const votesAgainst = Number(src.votes_against || 0);
  const totalVotes = votesFor + votesAgainst;
  const quorum = Number(src.quorum_required || 0);
  const participationRatio = quorum > 0 ? Math.min(totalVotes / quorum, 1) : 0.5;
  const approvalRatio = totalVotes > 0 ? votesFor / totalVotes : 0.5;
  const status = src.status || '';

  const governanceScore = Math.round(
    (participationRatio * 40) +
    (approvalRatio * 30) +
    (['PASSED','EXECUTED','APPROVED'].includes(status.toUpperCase()) ? 20 : 5) +
    ((doc.evidenceCount || 0) > 0 ? 10 : 0)
  );

  const desc = doc.action?.description || '';
  const descLength = desc.length;
  const hasSections = ['abstract','specification','rationale','implementation','timeline','budget']
    .filter(s => desc.toLowerCase().includes(s)).length;
  const technicalScore = Math.min(100, Math.round(
    Math.min(descLength / 50, 30) + (hasSections * 8) + 10
  ));

  const tags = doc.action?.tags || [];
  const communityTags = ['community','social','education','grant','dao','governance','delegate'];
  const communityRelevance = tags.filter((t: string) => communityTags.includes(t.toLowerCase())).length;
  const communityScore = Math.min(100, Math.round(
    (communityRelevance * 15) +
    (totalVotes > 1000 ? 30 : totalVotes > 100 ? 20 : 10) +
    20
  ));

  return { technical: technicalScore, governance: governanceScore, community: communityScore,
           verifiedCount: doc.evidenceCount || 0, totalMilestones: 1 };
}

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log('✅ Conectado a MongoDB Atlas');

  const col = client.db('andromeda_core').collection('milestones');
  const docs = await col.find({}).toArray();
  console.log(`📊 Recalculando AVIP para ${docs.length} registros...`);

  let updated = 0, errors = 0;
  for (const doc of docs) {
    try {
      const metrics = extractMetrics(doc);
      const avipScore = calculateAVIP(metrics);
      await col.updateOne(
        { _id: doc._id },
        { $set: { 
          'metadata.avipScore': avipScore,
          'metadata.trustScore': avipScore.total,
          'metadata.updatedAt': new Date().toISOString()
        }}
      );
      updated++;
      if (updated % 10 === 0) console.log(`  ✓ ${updated}/${docs.length}`);
    } catch (e: any) {
      errors++;
      console.error(`  ✗ Error en ${doc.atlasId}: ${e.message}`);
    }
  }

  console.log(`\n✅ Completado: ${updated} actualizados, ${errors} errores`);
  await client.close();
}

main().catch(console.error);

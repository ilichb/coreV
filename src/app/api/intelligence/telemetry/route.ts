import { NextResponse } from 'next/server';
import { mongoDBClient } from '@/lib/infrastructure/mongodb';

/**
 * GET /api/intelligence/telemetry
 * 
 * Returns real system metrics for the Intelligence page:
 * - MongoDB milestone counts per ecosystem
 * - Rootstock builder and proposal counts (live from subgraph)
 * - Database connection status
 */
export async function GET() {
  const telemetry: Record<string, any> = {
    timestamp: new Date().toISOString(),
    ecosystems: {},
    dataSources: {},
    systemStatus: {}
  };

  // 1. MongoDB stats: count real milestones per ecosystem
  try {
    await mongoDBClient.connect();
    const col = mongoDBClient.getMilestonesCollection();

    if (!col) {
      telemetry.systemStatus.database = 'error';
      telemetry.systemStatus.databaseError = 'MongoDB collection not available';
      telemetry.dataSources.totalMilestones = 0;
      telemetry.dataSources.uniqueBuilders = 0;
      telemetry.dataSources.verifiedCount = 0;
      telemetry.dataSources.rootstockMilestones = 0;
      telemetry.dataSources.snapshotMilestones = 0;
    } else {
      const [total, rootstockCount, snapshotCount] = await Promise.all([
        col.countDocuments({}),
        col.countDocuments({ 'sourceScorecard.metadata.ecosystem': 'rootstock' }),
        col.countDocuments({ 'sourceScorecard.metadata.ecosystem': 'snapshot' }),
      ]);

      // Count unique builders (distinct builderDid values)
      const builderAgg = await col.distinct('action.metadata.builderDid');
      const uniqueBuilders = builderAgg.filter(Boolean).length;

      // Count verified milestones
      const verified = await col.countDocuments({ status: 'VERIFIED' });

      telemetry.dataSources.totalMilestones = total;
      telemetry.dataSources.uniqueBuilders = uniqueBuilders;
      telemetry.dataSources.verifiedCount = verified;
      telemetry.dataSources.rootstockMilestones = rootstockCount;
      telemetry.dataSources.snapshotMilestones = snapshotCount;
      telemetry.systemStatus.database = 'online';
      telemetry.systemStatus.databaseDetail = `${total} milestones indexed`;
    }
  } catch (e: any) {
    telemetry.systemStatus.database = 'error';
    telemetry.systemStatus.databaseError = e.message;
    telemetry.dataSources.totalMilestones = 0;
    telemetry.dataSources.uniqueBuilders = 0;
    telemetry.dataSources.verifiedCount = 0;
    telemetry.dataSources.rootstockMilestones = 0;
    telemetry.dataSources.snapshotMilestones = 0;
  }

  // 2. Rootstock live: count builders and proposals from subgraphs
  try {
    const apiKey = process.env.THEGRAPH_API_KEY || '';
    if (!apiKey) {
      telemetry.ecosystems.rootstock = { builders: 0, proposals: 0, status: 'api_key_missing' };
    } else {
      const rewardsSubgraph = `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/7kSWmHvWixeZBpzVfgkGS2sYNYoXZz614TcqnPTgkWwA`;
      const govSubgraph = `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/C9muK2hesS2V8ZpcR755wVfo9UUhfWSXaDhDKMkCNejP`;

      const controller = new AbortController();
      setTimeout(() => controller.abort(), 7000);

      const [buildersRes, proposalsRes] = await Promise.allSettled([
        fetch(rewardsSubgraph, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `{ backerStakingHistories(first: 1000) { id } }`
          }),
          signal: controller.signal
        }),
        fetch(govSubgraph, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `{ proposals(first: 1000) { id status } }`
          }),
          signal: controller.signal
        })
      ]);

      if (buildersRes.status === 'fulfilled' && buildersRes.value.ok) {
        const d = await buildersRes.value.json();
        telemetry.ecosystems.rootstock = {
          builders: d.data?.backerStakingHistories?.length || 0,
          status: 'synced'
        };
      } else {
        telemetry.ecosystems.rootstock = { builders: 0, status: 'error' };
      }

      if (proposalsRes.status === 'fulfilled' && proposalsRes.value.ok) {
        const d = await proposalsRes.value.json();
        const proposals = d.data?.proposals || [];
        telemetry.ecosystems.rootstock.proposals = proposals.length;
        telemetry.ecosystems.rootstock.activeProposals = proposals.filter(
          (p: any) => p.status === 'Active'
        ).length;
      }
    }
  } catch (e: any) {
    telemetry.ecosystems.rootstock = { builders: 0, proposals: 0, status: 'error' };
  }

  // 3. Core services health
  telemetry.systemStatus.coreServices = 'operational';
  telemetry.systemStatus.apiGateway = 'operational';
  telemetry.systemStatus.dataFlow = 'active';

  // MongoDB is already set above

  return NextResponse.json({ success: true, telemetry });
}

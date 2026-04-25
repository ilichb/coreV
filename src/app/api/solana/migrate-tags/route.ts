import { NextResponse } from 'next/server';
import { mongoDBClient } from '@/lib/infrastructure/mongodb';

export async function POST() {
  try {
    await mongoDBClient.connect();
    const db = mongoDBClient.getDb();
    const collections = await db.listCollections().toArray();
    const results: any[] = [];

    for (const col of collections) {
      const collection = db.collection(col.name);
      const filter = {
        $or: [
          { 'action.description': { $regex: 'Solana', $options: 'i' } },
          { 'milestone_data.action.description': { $regex: 'Solana', $options: 'i' } }
        ]
      };
      const count = await collection.countDocuments(filter);
      if (count > 0) {
        const result = await collection.updateMany(filter, [{
          $set: {
            'action.tags': {
              $concatArrays: [
                { $ifNull: ['$action.tags', []] },
                ['solana', 'on-chain', 'andromeda-solana']
              ]
            },
            'action.metadata.ecosystem': 'solana',
            'sourceScorecard.ecosystem': 'solana',
          }
        }]);
        results.push({ collection: col.name, found: count, updated: result.modifiedCount });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

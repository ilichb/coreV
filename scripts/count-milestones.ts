import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env.local' });

async function countMilestones() {
  const username = encodeURIComponent(process.env.MONGODB_USERNAME || '');
  const password = encodeURIComponent(process.env.MONGODB_PASSWORD || '');
  const cluster = process.env.MONGODB_CLUSTER;

  const uri = `mongodb+srv://${username}:${password}@${cluster}/?retryWrites=true&w=majority`;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const database = client.db('andromeda_atlas');
    const collection = database.collection('milestones');

    const total = await collection.countDocuments();
    console.log(`Total milestones: ${total}`);

    const rootstock = await collection.countDocuments({ 'sourceScorecard.metadata.ecosystem': 'rootstock' });
    console.log(`Rootstock milestones: ${rootstock}`);

  } finally {
    await client.close();
  }
}

countMilestones().catch(console.error);

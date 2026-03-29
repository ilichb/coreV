import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import path from 'path';

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local from the root project
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

async function testConnection() {
    const username = process.env.MONGODB_USERNAME || 'admin_andromeda';
    const password = process.env.MONGODB_PASSWORD;
    const cluster = process.env.MONGODB_CLUSTER || 'andromedacore.jtkz6fn.mongodb.net';
    const appName = process.env.MONGODB_APP_NAME || 'AndromedaCore';

    if (!password) {
        console.error('❌ MONGODB_PASSWORD not found in environment');
        process.exit(1);
    }

    const uri = `mongodb+srv://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${cluster}/?appName=${encodeURIComponent(appName)}`;
    
    console.log(`🔄 Attempting to connect to MongoDB Atlas Cluster: ${cluster}`);
    console.log(`👤 User: ${username}`);
    
    const client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 20000,
    });

    try {
        const start = Date.now();
        await client.connect();
        const latency = Date.now() - start;

        console.log(`✅ Successfully connected to MongoDB Atlas!`);
        console.log(`⏱️ Initial connection latency: ${latency}ms`);

        const db = client.db('andromeda_core');
        const pingStart = Date.now();
        await db.command({ ping: 1 });
        const pingLatency = Date.now() - pingStart;

        console.log(`🏓 Ping latency: ${pingLatency}ms`);

        const collections = await db.listCollections().toArray();
        console.log(`📂 Collections in 'andromeda_core':`, collections.map(c => c.name).join(', '));

        console.log('🚀 Ready for high-performance operations on the new plan.');

    } catch (error: any) {
        console.error('❌ MongoDB Connection Error:', error.message);
    } finally {
        await client.close();
    }
}

testConnection();

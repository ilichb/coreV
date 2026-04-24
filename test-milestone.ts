import { solanaClient } from './src/lib/clients/solana-client';

async function test() {
  const merkleRoot = new Uint8Array(32);
  // Llenar con un hash de ejemplo (en realidad sería un hash real)
  for (let i = 0; i < 32; i++) merkleRoot[i] = i;

  const metadata = {
    merkle_root: merkleRoot,
    ipfs_cid: "QmExample123",
    did: "did:sol:GUjhtFcxBEpi6",
    ecosystem: "solana",
    dao_identifier: "test-dao"
  };

  try {
    const tx = await solanaClient.anchorMilestone(metadata);
    console.log("✅ Milestone anchored:", tx);
  } catch (err) {
    console.error("❌ Error:", err);
  }
}

test();

const { ethers } = require('ethers');

async function testAVIP() {
  const provider = new ethers.JsonRpcProvider('http://localhost:8545');
  const signer = await provider.getSigner(0);
  const address = await signer.getAddress();
  
  console.log('Testing AVIP connection...');
  console.log('Signer address:', address);
  console.log('Balance:', await provider.getBalance(address));
}

testAVIP().catch(console.error);

import { ethers } from "hardhat";

async function main() {
  console.log("Deploying AVIPRegistry...");
  
  const AVIPRegistry = await ethers.getContractFactory("AVIPRegistry");
  const registry = await AVIPRegistry.deploy();
  
  await registry.waitForDeployment();
  const address = await registry.getAddress();
  
  console.log("AVIPRegistry deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

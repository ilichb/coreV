import { expect } from "chai";
import hre from "hardhat";
import { AVIPRegistry } from "../../typechain-types";

describe("AVIPRegistry", function () {
  let registry: AVIPRegistry;
  let owner: any;
  let validator: any;
  let unauthorized: any;
  
  beforeEach(async function () {
    [owner, validator, unauthorized] = await hre.ethers.getSigners();
    
    const AVIPRegistry = await hre.ethers.getContractFactory("AVIPRegistry");
    registry = await AVIPRegistry.deploy();
    await registry.waitForDeployment();
    
    await registry.connect(owner).authorizeValidator(validator.address);
  });
  
  it("Should submit batch and verify gas", async function () {
    const merkleRoot = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("test"));
    const mmrRoot = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("mmr"));
    
    const tx = await registry.connect(validator).submitBatch(
      merkleRoot,
      mmrRoot,
      10,
      hre.ethers.ZeroHash
    );
    
    const receipt = await tx.wait();
    expect(receipt).to.not.be.null;
    
    // Gas check
    const gasUsed = receipt?.gasUsed || BigInt(0);
    console.log(`Gas used for submitBatch: ${gasUsed}`);
    expect(gasUsed).to.be.lessThan(150000);
  });
});

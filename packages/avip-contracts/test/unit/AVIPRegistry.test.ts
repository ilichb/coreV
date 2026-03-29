import { expect } from "chai";
import { ethers } from "hardhat";
import { AVIPRegistry } from "../../typechain-types";

describe("AVIPRegistry", function () {
  let registry: AVIPRegistry;
  let owner: any;
  let validator: any;
  let unauthorized: any;
  
  const merkleRoot = ethers.keccak256(ethers.toUtf8Bytes("test-merkle"));
  const mmrRoot = ethers.keccak256(ethers.toUtf8Bytes("test-mmr"));
  
  beforeEach(async function () {
    [owner, validator, unauthorized] = await ethers.getSigners();
    
    const AVIPRegistry = await ethers.getContractFactory("AVIPRegistry");
    registry = await AVIPRegistry.deploy();
    await registry.waitForDeployment();
    
    await registry.connect(owner).authorizeValidator(validator.address);
  });
  
  describe("Deployment", function () {
    it("Should set deployer as owner", async function () {
      expect(await registry.owner()).to.equal(owner.address);
    });
    
    it("Should authorize owner as validator", async function () {
      expect(await registry.isValidatorAuthorized(owner.address)).to.be.true;
    });
    
    it("Should start with zero batches", async function () {
      expect(await registry.totalBatches()).to.equal(0);
    });
  });
  
  describe("Batch Submission", function () {
    it("Should submit valid genesis batch", async function () {
      const tx = await registry.connect(validator).submitBatch(
        merkleRoot,
        mmrRoot,
        10,
        ethers.ZeroHash
      );
      
      const receipt = await tx.wait();
      expect(receipt).to.not.be.null;
      
      expect(await registry.totalBatches()).to.equal(1);
      
      const latestBatchId = await registry.getLatestBatch();
      expect(latestBatchId).to.not.equal(ethers.ZeroHash);
    });
    
    it("Should reject unauthorized validator", async function () {
      await expect(
        registry.connect(unauthorized).submitBatch(merkleRoot, mmrRoot, 10, ethers.ZeroHash)
      ).to.be.revertedWithCustomError(registry, "UnauthorizedValidator");
    });
    
    it("Should reject batch size below minimum", async function () {
      await expect(
        registry.connect(validator).submitBatch(merkleRoot, mmrRoot, 0, ethers.ZeroHash)
      ).to.be.revertedWithCustomError(registry, "InvalidBatchSize");
    });
    
    it("Should reject batch size above maximum", async function () {
      await expect(
        registry.connect(validator).submitBatch(merkleRoot, mmrRoot, 1001, ethers.ZeroHash)
      ).to.be.revertedWithCustomError(registry, "InvalidBatchSize");
    });
    
    it("Should reject empty merkle root", async function () {
      await expect(
        registry.connect(validator).submitBatch(ethers.ZeroHash, mmrRoot, 10, ethers.ZeroHash)
      ).to.be.revertedWithCustomError(registry, "InvalidMerkleRoot");
    });
  });
  
  describe("Admin Functions", function () {
    it("Should allow owner to authorize validators", async function () {
      const newValidator = unauthorized;
      
      await expect(
        registry.connect(owner).authorizeValidator(newValidator.address)
      ).to.emit(registry, "ValidatorAuthorized");
      
      expect(await registry.isValidatorAuthorized(newValidator.address)).to.be.true;
    });
  });
});

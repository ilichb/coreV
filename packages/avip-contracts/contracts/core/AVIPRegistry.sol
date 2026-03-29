// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract AVIPRegistry is Ownable, ReentrancyGuard, Pausable {
    
    error UnauthorizedValidator(address validator);
    error InvalidBatchSize(uint256 size);
    error BatchAlreadyExists(bytes32 batchId);
    error BatchNotFound(bytes32 batchId);
    error InvalidMerkleRoot();
    error InvalidPreviousBatch();
    error AlreadyVerified();
    error ZeroAddress();
    
    event BatchSubmitted(
        bytes32 indexed batchId,
        bytes32 indexed merkleRoot,
        bytes32 mmrRoot,
        address indexed submitter,
        uint256 timestamp,
        uint256 itemCount,
        bytes32 previousBatchId
    );
    
    event BatchVerified(
        bytes32 indexed batchId,
        address indexed verifier,
        uint256 timestamp
    );
    
    event ValidatorAuthorized(
        address indexed validator,
        address indexed authorizer,
        uint256 timestamp
    );
    
    event ValidatorRevoked(
        address indexed validator,
        address indexed revoker,
        uint256 timestamp
    );
    
    struct Batch {
        bytes32 batchId;
        bytes32 merkleRoot;
        bytes32 mmrRoot;
        address submitter;
        uint256 timestamp;
        uint256 itemCount;
        bytes32 previousBatchId;
        bool verified;
    }
    
    mapping(bytes32 => Batch) private _batches;
    bytes32[] private _batchIds;
    mapping(address => bool) private _authorizedValidators;
    uint256 private _totalBatches;
    bytes32 private _latestBatchId;
    
    uint256 public constant MIN_BATCH_SIZE = 1;
    uint256 public constant MAX_BATCH_SIZE = 1000;
    
    constructor() Ownable(msg.sender) {
        _authorizedValidators[msg.sender] = true;
        emit ValidatorAuthorized(msg.sender, msg.sender, block.timestamp);
    }
    
    function submitBatch(
        bytes32 merkleRoot,
        bytes32 mmrRoot,
        uint256 itemCount,
        bytes32 previousBatchId
    ) external nonReentrant whenNotPaused returns (bytes32 batchId) {
        if (!_authorizedValidators[msg.sender]) {
            revert UnauthorizedValidator(msg.sender);
        }
        
        if (itemCount < MIN_BATCH_SIZE || itemCount > MAX_BATCH_SIZE) {
            revert InvalidBatchSize(itemCount);
        }
        
        if (merkleRoot == bytes32(0)) {
            revert InvalidMerkleRoot();
        }
        
        if (previousBatchId != bytes32(0)) {
            if (_batches[previousBatchId].timestamp == 0) {
                revert InvalidPreviousBatch();
            }
        }
        
        batchId = keccak256(
            abi.encodePacked(
                merkleRoot,
                mmrRoot,
                block.timestamp,
                msg.sender,
                _totalBatches,
                block.number
            )
        );
        
        if (_batches[batchId].timestamp != 0) {
            revert BatchAlreadyExists(batchId);
        }
        
        _batches[batchId] = Batch({
            batchId: batchId,
            merkleRoot: merkleRoot,
            mmrRoot: mmrRoot,
            submitter: msg.sender,
            timestamp: block.timestamp,
            itemCount: itemCount,
            previousBatchId: previousBatchId,
            verified: false
        });
        
        _batchIds.push(batchId);
        _totalBatches++;
        _latestBatchId = batchId;
        
        emit BatchSubmitted(
            batchId,
            merkleRoot,
            mmrRoot,
            msg.sender,
            block.timestamp,
            itemCount,
            previousBatchId
        );
        
        return batchId;
    }
    
    function verifyBatch(bytes32 batchId) external nonReentrant whenNotPaused {
        if (!_authorizedValidators[msg.sender]) {
            revert UnauthorizedValidator(msg.sender);
        }
        
        Batch storage batch = _batches[batchId];
        if (batch.timestamp == 0) {
            revert BatchNotFound(batchId);
        }
        
        if (batch.verified) {
            revert AlreadyVerified();
        }
        
        batch.verified = true;
        
        emit BatchVerified(batchId, msg.sender, block.timestamp);
    }
    
    function authorizeValidator(address validator) external onlyOwner {
        if (validator == address(0)) {
            revert ZeroAddress();
        }
        require(!_authorizedValidators[validator], "Already authorized");
        
        _authorizedValidators[validator] = true;
        emit ValidatorAuthorized(validator, msg.sender, block.timestamp);
    }
    
    function revokeValidator(address validator) external onlyOwner {
        require(_authorizedValidators[validator], "Not authorized");
        
        _authorizedValidators[validator] = false;
        emit ValidatorRevoked(validator, msg.sender, block.timestamp);
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    function getBatch(bytes32 batchId) external view returns (Batch memory) {
        if (_batches[batchId].timestamp == 0) {
            revert BatchNotFound(batchId);
        }
        return _batches[batchId];
    }
    
    function getLatestBatch() external view returns (bytes32) {
        return _latestBatchId;
    }
    
    function getBatchIdByIndex(uint256 index) external view returns (bytes32) {
        require(index < _batchIds.length, "Index out of bounds");
        return _batchIds[index];
    }
    
    function totalBatches() external view returns (uint256) {
        return _totalBatches;
    }
    
    function isValidatorAuthorized(address validator) external view returns (bool) {
        return _authorizedValidators[validator];
    }
    
    function verifyChainIntegrity(bytes32 batchId) external view returns (bool isValid) {
        if (_batches[batchId].timestamp == 0) {
            return false;
        }
        
        bytes32 currentBatchId = batchId;
        uint256 maxIterations = _totalBatches;
        uint256 iterations = 0;
        
        while (currentBatchId != bytes32(0) && iterations < maxIterations) {
            Batch memory currentBatch = _batches[currentBatchId];
            
            if (currentBatch.timestamp == 0) {
                return false;
            }
            
            currentBatchId = currentBatch.previousBatchId;
            iterations++;
        }
        
        return currentBatchId == bytes32(0);
    }
}

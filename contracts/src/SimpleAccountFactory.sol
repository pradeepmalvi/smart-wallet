// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import "openzeppelin-contracts/contracts/utils/Create2.sol";
import "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "src/SimpleAccount.sol";

struct User {
    uint256 id;
    bytes32[2] publicKey;
    address account;
}

contract SimpleAccountFactory is ReentrancyGuard {
    SimpleAccount public accountImplem;
    IEntryPoint public immutable entryPoint; // Marked immutable for efficiency
    address public owner;

    mapping(uint256 => User) public users;

    event UserSaved(uint256 indexed id, bytes32[2] publicKey, address account);
    event AccountCreated(address indexed account, bytes32[2] publicKey);
    event ImplementationUpdated(address indexed newImplementation);

    constructor(IEntryPoint _entryPoint) {
        owner = msg.sender;
        entryPoint = _entryPoint;
        accountImplem = new SimpleAccount(_entryPoint);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    function saveUser(uint256 id, bytes32[2] memory publicKey) external nonReentrant {
        require(users[id].id == 0, "User ID already exists");
        require(publicKey[0] != bytes32(0) && publicKey[1] != bytes32(0), "Invalid public key"); // Added key validation
        address calculatedAddress = this.getAddress(publicKey);
        users[id] = User(id, publicKey, calculatedAddress);
        emit UserSaved(id, publicKey, calculatedAddress);
    }

    function getUser(uint256 id) external view returns (User memory) {
        require(users[id].id != 0, "User does not exist"); // Added check for non-existent users
        return users[id];
    }

    function createAccount(bytes32[2] memory publicKey)
        external
        payable
        nonReentrant
        returns (SimpleAccount)
    {
        require(publicKey[0] != bytes32(0) && publicKey[1] != bytes32(0), "Invalid public key"); // Validate publicKey

        address addr = getAddress(publicKey);

        if (msg.value > 0) {
            entryPoint.depositTo{value: msg.value}(addr);
        }

        if (addr.code.length > 0) {
            return SimpleAccount(payable(addr));
        }

        // Proxy creation with deterministic address
        address proxyAddress = address(
            new ERC1967Proxy{salt: keccak256(abi.encodePacked(publicKey))}(
                address(accountImplem),
                abi.encodeCall(SimpleAccount.initialize, (publicKey))
            )
        );

        require(proxyAddress == addr, "Address mismatch"); // Ensure proxy matches expected address
        emit AccountCreated(proxyAddress, publicKey);
        return SimpleAccount(payable(proxyAddress));
    }

    function getAddress(bytes32[2] memory publicKey) public view returns (address) {
        return
            Create2.computeAddress(
                keccak256(abi.encodePacked(publicKey)),
                keccak256(
                    abi.encodePacked(
                        type(ERC1967Proxy).creationCode,
                        abi.encode(
                            address(accountImplem),
                            abi.encodeCall(SimpleAccount.initialize, (publicKey))
                        )
                    )
                )
            );
    }

    function setImplementation(SimpleAccount newImplementation) external onlyOwner {
        require(address(newImplementation) != address(0), "Invalid implementation address"); // Ensure non-zero address
        accountImplem = newImplementation;
        emit ImplementationUpdated(address(newImplementation)); // Emit event for traceability
    }
}

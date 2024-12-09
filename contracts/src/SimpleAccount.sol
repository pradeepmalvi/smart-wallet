// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/console2.sol";
import "account-abstraction/interfaces/IAccount.sol";
import "account-abstraction/interfaces/IEntryPoint.sol";
import "account-abstraction/core/Helpers.sol";
import {WebAuthn} from "src/WebAuthn.sol";
import "openzeppelin-contracts/contracts/interfaces/IERC1271.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";

struct Signature {
    bytes authenticatorData;
    string clientDataJSON;
    uint256 challengeLocation;
    uint256 responseTypeLocation;
    uint256 r;
    uint256 s;
}

struct Call {
    address dest;
    uint256 value;
    bytes data;
}

contract SimpleAccount is IAccount, UUPSUpgradeable, Initializable, IERC1271, ReentrancyGuard {
    using Address for address;

    struct PublicKey {
        bytes32 X;
        bytes32 Y;
    }

    IEntryPoint public immutable entryPoint; // Marked immutable for gas efficiency
    PublicKey public publicKey;

    event SimpleAccountInitialized(IEntryPoint indexed entryPoint, bytes32[2] pubKey);
    event EtherReceived(address indexed sender, uint256 amount);
    event AccountUpgraded(address indexed proxy, address newImplementation);
    event ERC20Transferred(address indexed token, address indexed to, uint256 amount);
    event FundsRefunded(address indexed recipient, uint256 amount);

    uint256 private constant _SIG_VALIDATION_FAILED = 1;

    constructor(IEntryPoint _entryPoint) {
        entryPoint = _entryPoint;
        _disableInitializers();
    }

    function initialize(bytes32[2] memory aPublicKey) public initializer {
        require(aPublicKey[0] != bytes32(0) && aPublicKey[1] != bytes32(0), "Invalid public key");
        publicKey = PublicKey(aPublicKey[0], aPublicKey[1]);
        emit SimpleAccountInitialized(entryPoint, [publicKey.X, publicKey.Y]);
    }

    receive() external payable {
        emit EtherReceived(msg.sender, msg.value);
    }

    fallback() external payable {
        emit EtherReceived(msg.sender, msg.value);
    }

    function executeBatch(Call[] calldata calls) external onlyEntryPoint {
        for (uint256 i = 0; i < calls.length; i++) {
            _call(calls[i].dest, calls[i].value, calls[i].data);
        }
    }

    function _validateSignature(
        bytes memory message,
        bytes calldata signature
    ) private view returns (bool) {
        Signature memory sig = abi.decode(signature, (Signature));

        return
            WebAuthn.verifySignature({
                challenge: message,
                authenticatorData: sig.authenticatorData,
                requireUserVerification: true, // Enforcing user verification for enhanced security
                clientDataJSON: sig.clientDataJSON,
                challengeLocation: sig.challengeLocation,
                responseTypeLocation: sig.responseTypeLocation,
                r: sig.r,
                s: sig.s,
                x: uint256(publicKey.X),
                y: uint256(publicKey.Y)
            });
    }

    function isValidSignature(
        bytes32 message,
        bytes calldata signature
    ) external view override returns (bytes4 magicValue) {
        if (_validateSignature(abi.encodePacked(message), signature)) {
            return IERC1271.isValidSignature.selector;
        }
        return 0xffffffff;
    }

    function _validateUserOpSignature(
        UserOperation calldata userOp,
        bytes32 userOpHash
    ) private view returns (uint256 validationData) {
        bytes memory messageToVerify;
        bytes calldata signature;
        ValidationData memory returnIfValid;

        uint256 sigLength = userOp.signature.length;
        if (sigLength == 0) return _SIG_VALIDATION_FAILED;

        uint8 version = uint8(userOp.signature[0]);
        if (version == 1) {
            if (sigLength < 7) return _SIG_VALIDATION_FAILED;
            uint48 validUntil = uint48(bytes6(userOp.signature[1:7]));

            signature = userOp.signature[7:];
            messageToVerify = abi.encodePacked(version, validUntil, userOpHash);
            returnIfValid.validUntil = validUntil;
        } else {
            return _SIG_VALIDATION_FAILED;
        }

        if (_validateSignature(messageToVerify, signature)) {
            return _packValidationData(returnIfValid);
        }
        return _SIG_VALIDATION_FAILED;
    }

    function _call(address target, uint256 value, bytes memory data) internal {
        require(target.isContract(), "Target must be a contract"); // Ensure target is a contract
        (bool success, bytes memory result) = target.call{value: value}(data);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
    }

    function validateUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external override onlyEntryPoint returns (uint256 validationData) {
        validationData = _validateUserOpSignature(userOp, userOpHash);
        _payPrefund(missingAccountFunds);
    }

    function _payPrefund(uint256 missingAccountFunds) private nonReentrant { // Added reentrancy guard
        if (missingAccountFunds != 0) {
            (bool success, ) = payable(msg.sender).call{value: missingAccountFunds}("");
            require(success, "Prefund transfer failed");
            emit FundsRefunded(msg.sender, missingAccountFunds); // Added event emission
        }
    }

    modifier onlySelf() {
        require(msg.sender == address(this), "only self");
        _;
    }

    modifier onlyEntryPoint() {
        require(msg.sender == address(entryPoint), "only entry point");
        _;
    }

    function _authorizeUpgrade(address newImplementation) internal view override onlySelf {
        require(newImplementation != address(0), "New implementation cannot be zero address");
    }

    function transferERC20(
        address token,
        address to,
        uint256 amount
    ) external nonReentrant onlyEntryPoint {
        require(IERC20(token).transfer(to, amount), "Transfer failed");
        emit ERC20Transferred(token, to, amount);
    }

    function upgradeAccount(address proxy, address payable newImplementation) external onlyEntryPoint {
        UUPSUpgradeable(proxy).upgradeTo(newImplementation);
        emit AccountUpgraded(proxy, newImplementation);
    }
}

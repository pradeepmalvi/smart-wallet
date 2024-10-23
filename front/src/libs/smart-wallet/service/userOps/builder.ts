import {
  Chain,
  GetContractReturnType,
  Hex,
  Client,
  PublicClient,
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  encodePacked,
  getContract,
  http,
  parseAbi,
  toHex,
  encodeAbiParameters,
  Address,
  zeroAddress,
} from "viem";
import {
  UserOperationAsHex,
  UserOperation,
  NativeCall,
  TokenCall,
} from "@/libs/smart-wallet/service/userOps/types";
import { DEFAULT_USER_OP } from "@/libs/smart-wallet/service/userOps/constants";
import { P256Credential, WebAuthn } from "@/libs/web-authn";
import {
  ENTRYPOINT_ABI,
  ENTRYPOINT_ADDRESS,
  FACTORY_ABI,
  getChainFromLocalStorage,
  getTransportFromLocalStorage,
} from "@/constants";
import { smartWallet } from "@/libs/smart-wallet";

export class UserOpBuilder {
  public relayer: Hex = "0x061060a65146b3265C62fC8f3AE977c9B27260fF";
  public entryPoint: Hex = ENTRYPOINT_ADDRESS;
  public chain: Chain;
  public publicClient: PublicClient;
  public factoryContract: GetContractReturnType<typeof FACTORY_ABI, Client>;

  constructor(chain: Chain) {
    this.chain = chain;
    const selectedChain = localStorage.getItem("chain");
    const factoryContractAddress = (() => {
      switch (selectedChain) {
        case "Ethereum":
          return process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ADDRESS_ETHEREUM;
        case "Polygon":
          return process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ADDRESS_POLYGON;
        case "Binance":
          return process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ADDRESS_BINANCE;
        default:
          return undefined;
      }
    })();

    if (!selectedChain) {
      throw new Error("Selected chain is not available in local storage");
    }

    this.publicClient = createPublicClient({
      chain: getChainFromLocalStorage(selectedChain),
      transport: getTransportFromLocalStorage(selectedChain),
    }) as PublicClient;

    const walletClient = createWalletClient({
      account: this.relayer,
      chain: getChainFromLocalStorage(selectedChain),
      transport: getTransportFromLocalStorage(selectedChain),
    });

    this.factoryContract = getContract({
      address: factoryContractAddress as Hex, // only on Sepolia
      abi: FACTORY_ABI,
      client: {
        wallet: walletClient,
        public: this.publicClient,
      },
    });
  }

  // reference: https://ethereum.stackexchange.com/questions/150796/how-to-create-a-raw-erc-4337-useroperation-from-scratch-and-then-send-it-to-bund
  async buildUserOp({
    calls,
    maxFeePerGas,
    maxPriorityFeePerGas,
    keyId,
    transferType,
  }: {
    calls: NativeCall[] | TokenCall;
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
    keyId: Hex;
    transferType?: string;
  }): Promise<UserOperationAsHex> {
    // calculate smart wallet address via Factory contract to know the sender
    const { account, publicKey } = await this._calculateSmartWalletAddress(keyId); // the keyId is the id tied to the user's public key
    // get bytecode
    const bytecode = await this.publicClient.getBytecode({
      address: account,
    });

    let initCode = toHex(new Uint8Array(0));
    let initCodeGas = BigInt(0);
    if (bytecode === undefined) {
      // smart wallet does NOT already exists
      // calculate initCode and initCodeGas
      ({ initCode, initCodeGas } = await this._createInitCode(publicKey));
    }

    // calculate nonce
    const nonce = await this._getNonce(account);

    let callData;
    if (transferType === "Token" && !Array.isArray(calls)) {
      callData = this._addCallTokenData(calls as TokenCall);
    } else {
      callData = this._addCallData(calls as NativeCall[]);
    }

    // create user operation
    const userOp: UserOperation = {
      ...DEFAULT_USER_OP,
      sender: account,
      nonce,
      initCode,
      callData,
      maxFeePerGas,
      maxPriorityFeePerGas: maxFeePerGas,
    };

    // estimate gas for this partial user operation
    // real good article about the subject can be found here:
    // https://www.alchemy.com/blog/erc-4337-gas-estimation
    const { callGasLimit, verificationGasLimit, preVerificationGas } =
      await smartWallet.estimateUserOperationGas({
        userOp: this.toParams(userOp),
      });

    // set gas limits with the estimated values + some extra gas for safety
    userOp.callGasLimit = BigInt(callGasLimit);
    userOp.preVerificationGas = BigInt(preVerificationGas) * BigInt(10);
    userOp.verificationGasLimit =
      BigInt(verificationGasLimit) + BigInt(150_000) + BigInt(initCodeGas) + BigInt(1_000_000);

    // get userOp hash (with signature == 0x) by calling the entry point contract
    const userOpHash = await this._getUserOpHash(userOp);

    // version = 1 and validUntil = 0 in msgToSign are hardcoded
    const msgToSign = encodePacked(["uint8", "uint48", "bytes32"], [1, 0, userOpHash]);

    // get signature from webauthn
    const signature = await this.getSignature(msgToSign, keyId);

    return this.toParams({ ...userOp, signature });
  }

  public toParams(op: UserOperation): UserOperationAsHex {
    return {
      sender: op.sender,
      nonce: toHex(op.nonce),
      initCode: op.initCode,
      callData: op.callData,
      callGasLimit: toHex(op.callGasLimit),
      verificationGasLimit: toHex(op.verificationGasLimit),
      preVerificationGas:  toHex(op.preVerificationGas),
      maxFeePerGas: toHex(op.maxFeePerGas),
      maxPriorityFeePerGas: toHex(op.maxPriorityFeePerGas),
      paymasterAndData: op.paymasterAndData === zeroAddress ? "0x" : op.paymasterAndData,
      signature: op.signature,
    };
  }

  public async getSignature(msgToSign: Hex, keyId: Hex): Promise<Hex> {
    const credentials: P256Credential = (await WebAuthn.get(msgToSign)) as P256Credential;

    if (credentials.rawId !== keyId) {
      throw new Error(
        "Incorrect passkeys used for tx signing. Please sign the transaction with the correct logged-in account",
      );
    }

    const signature = encodePacked(
      ["uint8", "uint48", "bytes"],
      [
        1,
        0,
        encodeAbiParameters(
          [
            {
              type: "tuple",
              name: "credentials",
              components: [
                {
                  name: "authenticatorData",
                  type: "bytes",
                },
                {
                  name: "clientDataJSON",
                  type: "string",
                },
                {
                  name: "challengeLocation",
                  type: "uint256",
                },
                {
                  name: "responseTypeLocation",
                  type: "uint256",
                },
                {
                  name: "r",
                  type: "bytes32",
                },
                {
                  name: "s",
                  type: "bytes32",
                },
              ],
            },
          ],
          [
            {
              authenticatorData: credentials.authenticatorData,
              clientDataJSON: JSON.stringify(credentials.clientData),
              challengeLocation: BigInt(23),
              responseTypeLocation: BigInt(1),
              r: credentials.signature.r,
              s: credentials.signature.s,
            },
          ],
        ),
      ],
    );

    return signature;
  }

  private async _createInitCode(
    pubKey: readonly [Hex, Hex],
  ): Promise<{ initCode: Hex; initCodeGas: bigint }> {
    let createAccountTx = encodeFunctionData({
      abi: FACTORY_ABI,
      functionName: "createAccount",
      args: [pubKey],
    });

    let initCode = encodePacked(
      ["address", "bytes"], // types
      [this.factoryContract.address, createAccountTx], // values
    );

    let initCodeGas = await this.publicClient.estimateGas({
      account: this.relayer,
      to: this.factoryContract.address,
      data: createAccountTx,
    });

    return {
      initCode,
      initCodeGas,
    };
  }

  private async _calculateSmartWalletAddress(
    id: Hex,
  ): Promise<{ account: Address; publicKey: readonly [Hex, Hex] }> {
    const user = await this.factoryContract.read.getUser([BigInt(id)]);
    return { account: user.account, publicKey: user.publicKey };
  }

  private _addCallData(calls: NativeCall[]): Hex {
    return encodeFunctionData({
      abi: [
        {
          inputs: [
            {
              components: [
                {
                  internalType: "address",
                  name: "dest",
                  type: "address",
                },
                {
                  internalType: "uint256",
                  name: "value",
                  type: "uint256",
                },
                {
                  internalType: "bytes",
                  name: "data",
                  type: "bytes",
                },
              ],
              internalType: "struct Call[]",
              name: "calls",
              type: "tuple[]",
            },
          ],
          name: "executeBatch",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
      ],
      functionName: "executeBatch",
      args: [calls],
    });
  }

  private _addCallTokenData(calls: TokenCall): Hex {
    return encodeFunctionData({
      abi: [
        {
          inputs: [
            {
              internalType: "address",
              name: "token",
              type: "address",
            },
            {
              internalType: "address",
              name: "to",
              type: "address",
            },
            {
              internalType: "uint256",
              name: "amount",
              type: "uint256",
            },
          ],
          name: "transferERC20",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
      ],
      functionName: "transferERC20",
      args: [calls.token, calls.to, calls.amount],
    });
  }

  private async _getNonce(smartWalletAddress: Hex): Promise<bigint> {
    const nonce: bigint = await this.publicClient.readContract({
      address: this.entryPoint,
      abi: parseAbi(["function getNonce(address, uint192) view returns (uint256)"]),
      functionName: "getNonce",
      args: [smartWalletAddress, BigInt(0)],
    });
    return nonce;
  }

  private async _getUserOpHash(userOp: UserOperation): Promise<Hex> {
    const entryPointContract = getContract({
      address: this.entryPoint,
      abi: ENTRYPOINT_ABI,
      client: {
        public: this.publicClient,
      },
    });

    const userOpHash = entryPointContract.read.getUserOpHash([userOp]);
    return userOpHash;
  }
}

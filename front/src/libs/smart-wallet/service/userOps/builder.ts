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
  getFactoryContract,
  getPimlicoRpcEndpoint,
  getTransportFromLocalStorage,
} from "@/constants";

export class UserOpBuilder {
  public relayer: Hex = "0x061060a65146b3265C62fC8f3AE977c9B27260fF";
  public entryPoint: Hex = ENTRYPOINT_ADDRESS;
  public chain: Chain;
  public publicClient: PublicClient;
  public factoryContract: GetContractReturnType<typeof FACTORY_ABI, Client>;

  constructor(chain: Chain) {
    this.chain = chain;
    const selectedChain = localStorage.getItem("chain");
    if (!selectedChain) throw new Error("Selected chain is not available in local storage");

    const factoryContractAddress = getFactoryContract(selectedChain as string);

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
      address: factoryContractAddress as Hex,
      abi: FACTORY_ABI,
      client: { wallet: walletClient, public: this.publicClient },
    });
  }

  /**
   * Build a complete UserOperation and send it to the bundler/relayer.
   */
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
  }): Promise<any> {
    // calculate smart wallet address via Factory contract
    const { account, publicKey } = await this._calculateSmartWalletAddress(keyId);

    // check if wallet bytecode exists (wallet already deployed)
    const bytecode = await this.publicClient.getBytecode({ address: account });

    let initCode: Hex = toHex(new Uint8Array(0));
    let initCodeGas: bigint = BigInt(0);
    if (bytecode === undefined) {
      const created = await this._createInitCode(publicKey);
      initCode = created.initCode;
      initCodeGas = created.initCodeGas;
    }

    const nonce = await this._getNonce(account);

    const callData =
      transferType === "Token" && !Array.isArray(calls)
        ? this._addCallTokenData(calls as TokenCall)
        : this._addCallData(calls as NativeCall[]);

    const maxGas = await this._pimlico_getUserOperationGasPrice();

    const userOp: UserOperation = {
      ...DEFAULT_USER_OP,
      sender: account,
      nonce,
      initCode,
      callData,
      maxFeePerGas: BigInt(maxGas.maxFeePerGas),
      maxPriorityFeePerGas: BigInt(maxGas.maxPriorityFeePerGas),
    };

    // get paymaster stub data (Pimlico flow)
    const paymasterStub = await this._pimlico_getPaymasterStubData(this.toParamsForPaymasterStubData(userOp));

    const gasEstimates = await this._estimateUserOperationGas(
      this.toParams({ ...userOp, paymasterAndData: paymasterStub.paymasterAndData }),
    );

    userOp.callGasLimit = BigInt(gasEstimates.callGasLimit);
    userOp.preVerificationGas = BigInt(gasEstimates.preVerificationGas) * BigInt(2);
    userOp.verificationGasLimit =
      BigInt(gasEstimates.verificationGasLimit) + BigInt(150_000) + BigInt(initCodeGas) + BigInt(1_000_000);
    userOp.paymasterAndData = paymasterStub.paymasterAndData;

    // get final paymaster data
    const pmData = await this._pimlico_getPaymasterData(this.toParamsForPaymaster({ ...userOp }));

    // compute userOp hash and sign
    const userOpHash = await this._getUserOpHash({ ...userOp, paymasterAndData: pmData.paymasterAndData });
    const msgToSign = encodePacked(["uint8", "uint48", "bytes32"], [1, 0, userOpHash]);
    const signature = await this.getSignature(msgToSign, keyId);

    const userOpFinal = this.toParams({ ...userOp, paymasterAndData: pmData.paymasterAndData, signature });

    const hash = await this._sendUserOperation(userOpFinal);
    return hash;
  }

  /** Convert UserOperation fields to hex-encoded params */
  public toParams(op: UserOperation): UserOperationAsHex {
    return {
      sender: op.sender,
      nonce: toHex(op.nonce),
      initCode: op.initCode,
      callData: op.callData,
      callGasLimit: toHex(op.callGasLimit),
      verificationGasLimit: toHex(op.verificationGasLimit),
      preVerificationGas: toHex(op.preVerificationGas),
      maxFeePerGas: toHex(op.maxFeePerGas),
      maxPriorityFeePerGas: toHex(op.maxPriorityFeePerGas),
      paymasterAndData: op.paymasterAndData,
      signature: op.signature,
    };
  }

  /** Similar to toParams but ensures paymasterAndData is not an empty zeroAddress */
  public toParamsForPaymaster(op: UserOperation): UserOperationAsHex {
    return {
      ...this.toParams(op),
      paymasterAndData: op.paymasterAndData === zeroAddress ? "0x" : op.paymasterAndData,
    };
  }

  public toParamsForPaymasterStubData(op: UserOperation): UserOperationAsHex {
    return this.toParamsForPaymaster(op);
  }

  /* --------------------- Pimlico / RPC helpers --------------------- */
  private async _pimlico_getUserOperationGasPrice() {
    const selectedChain = localStorage.getItem("chain");
    if (!selectedChain) throw new Error("Selected chain is not available in local storage");

    const options = {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "pimlico_getUserOperationGasPrice", params: [] }),
    };

    try {
      const response = await fetch(getPimlicoRpcEndpoint(selectedChain) as string, options);
      const data = await response.json();
      return data.result.slow;
    } catch (err) {
      console.error(err);
      throw new Error("Failed to get user operation gas price from Pimlico");
    }
  }

  private async _estimateUserOperationGas(userOp: any) {
    const selectedChain = localStorage.getItem("chain");
    if (!selectedChain) throw new Error("Selected chain is not available in local storage");

    const options = {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_estimateUserOperationGas", params: [userOp, this.entryPoint] }),
    };

    try {
      const response = await fetch(getPimlicoRpcEndpoint(selectedChain) as string, options);
      const data = await response.json();
      return data.result;
    } catch (err) {
      console.error(err);
      throw new Error("Failed to estimate gas for user operation");
    }
  }

  private async _sendUserOperation(userOp: UserOperation) {
    const selectedChain = localStorage.getItem("chain");
    if (!selectedChain) throw new Error("Selected chain is not available in local storage");

    const options = {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_sendUserOperation", params: [userOp, this.entryPoint] }),
    };

    try {
      const response = await fetch(getPimlicoRpcEndpoint(selectedChain) as string, options);
      const data = await response.json();
      return data.result;
    } catch (err) {
      console.error(err);
      throw new Error("Failed to send user operation");
    }
  }

  private async _pimlico_getPaymasterStubData(userOp: UserOperation) {
    const selectedChain = localStorage.getItem("chain");
    if (!selectedChain) throw new Error("Selected chain is not available in local storage");

    const options = {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "pm_getPaymasterStubData",
        id: 4337,
        params: [
          userOp,
          this.entryPoint,
          "0xaa36a7",
          { token: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" },
        ],
      }),
    };

    try {
      const response = await fetch(getPimlicoRpcEndpoint(selectedChain) as string, options);
      const data = await response.json();
      return data.result;
    } catch (err) {
      console.error(err);
      throw new Error("Failed to get paymaster stub data from Pimlico");
    }
  }

  private async _pimlico_getPaymasterData(userOp: UserOperation) {
    const selectedChain = localStorage.getItem("chain");
    if (!selectedChain) throw new Error("Selected chain is not available in local storage");

    const options = {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "pm_getPaymasterData",
        id: 4337,
        params: [
          userOp,
          this.entryPoint,
          "0xaa36a7",
          { token: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" },
        ],
      }),
    };

    try {
      const response = await fetch(getPimlicoRpcEndpoint(selectedChain) as string, options);
      const data = await response.json();
      return data.result;
    } catch (err) {
      console.error(err);
      throw new Error("Failed to get paymaster data from Pimlico");
    }
  }

  private async _getUserOperationReceipt(hash: UserOperation) {
    const selectedChain = localStorage.getItem("chain");
    if (!selectedChain) throw new Error("Selected chain is not available in local storage");

    const options = {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getUserOperationReceipt", params: [hash] }),
    };

    try {
      const response = await fetch(getPimlicoRpcEndpoint(selectedChain) as string, options);
      const data = await response.json();
      return data.result;
    } catch (err) {
      console.error(err);
      throw new Error("Failed to get user operation receipt");
    }
  }

  /* --------------------- Signatures / helpers --------------------- */
  public async getSignature(msgToSign: Hex, keyId: Hex): Promise<Hex> {
    const credentials: P256Credential = (await WebAuthn.get(msgToSign)) as P256Credential;
    if (credentials.rawId !== keyId) {
      throw new Error("Incorrect passkeys used for tx signing. Please sign with the correct account");
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
                { name: "authenticatorData", type: "bytes" },
                { name: "clientDataJSON", type: "string" },
                { name: "challengeLocation", type: "uint256" },
                { name: "responseTypeLocation", type: "uint256" },
                { name: "r", type: "bytes32" },
                { name: "s", type: "bytes32" },
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

  private async _createInitCode(pubKey: readonly [Hex, Hex]): Promise<{ initCode: Hex; initCodeGas: bigint }> {
    const createAccountTx = encodeFunctionData({ abi: FACTORY_ABI, functionName: "createAccount", args: [pubKey] });

    const initCode = encodePacked(["address", "bytes"], [this.factoryContract.address, createAccountTx]);

    const initCodeGas = await this.publicClient.estimateGas({
      account: this.relayer,
      to: this.factoryContract.address,
      data: createAccountTx,
    });

    return { initCode, initCodeGas };
  }

  private async _calculateSmartWalletAddress(id: Hex): Promise<{ account: Address; publicKey: readonly [Hex, Hex] }> {
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
                { internalType: "address", name: "dest", type: "address" },
                { internalType: "uint256", name: "value", type: "uint256" },
                { internalType: "bytes", name: "data", type: "bytes" },
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
    const maxUint256 = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
    const paymaster = "0x6666666666667849c56f2850848ce1c4da65c68b";

    const batchedCalls = [
      {
        dest: calls.token,
        value: BigInt(0),
        data: encodeFunctionData({
          abi: parseAbi(["function approve(address spender, uint256 amount)" ]),
          functionName: "approve",
          args: [paymaster, maxUint256],
        }),
      },
      {
        dest: calls.token,
        value: BigInt(0),
        data: encodeFunctionData({
          abi: parseAbi(["function transfer(address to, uint256 amount) returns (bool)" ]),
          functionName: "transfer",
          args: [calls.to, calls.amount],
        }),
      },
    ];

    return encodeFunctionData({
      abi: [
        {
          inputs: [
            {
              components: [
                { name: "dest", type: "address" },
                { name: "value", type: "uint256" },
                { name: "data", type: "bytes" },
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
      args: [batchedCalls],
    });
  }

  private async _getNonce(smartWalletAddress: Hex): Promise<bigint> {
    const nonce: bigint = await this.publicClient.readContract({
      address: this.entryPoint,
      abi: parseAbi(["function getNonce(address, uint192) view returns (uint256)" ]),
      functionName: "getNonce",
      args: [smartWalletAddress, BigInt(0)],
    });
    return nonce;
  }

  private async _getUserOpHash(userOp: UserOperation): Promise<Hex> {
    const entryPointContract = getContract({ address: this.entryPoint, abi: ENTRYPOINT_ABI, client: { public: this.publicClient } });
    const userOpHash = await entryPointContract.read.getUserOpHash([userOp]);
    return userOpHash;
  }
}

import {
  getChainFromLocalStorage,
  getPublicClient,
  getTransportFromLocalStorage,
} from "@/constants";
import { FACTORY_ABI } from "@/constants/factory";
import { Hex, createWalletClient, toHex, zeroAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export async function POST(req: Request) {
  const { id, pubKey, chain } = (await req.json()) as {
    id: Hex;
    pubKey: [Hex, Hex];
    chain: string;
  };

  const privateKeyMap: { [key: string]: string | undefined } = {
    Ethereum: process.env.RELAYER_PRIVATE_KEY_ETHEREUM,
    Polygon: process.env.RELAYER_PRIVATE_KEY_POLYGON,
    Binance: process.env.RELAYER_PRIVATE_KEY_BINANCE,
  };

  const factoryContractMap: { [key: string]: string | undefined } = {
    Ethereum: process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ADDRESS_ETHEREUM,
    Polygon: process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ADDRESS_POLYGON,
    Binance: process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ADDRESS_BINANCE,
  };

  const privateKey = privateKeyMap[chain] || process.env.RELAYER_PRIVATE_KEY_ETHEREUM;
  const factoryContract =
    factoryContractMap[chain] || process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ADDRESS_ETHEREUM;

  const account = privateKeyToAccount(privateKey as Hex);
  const walletClient = createWalletClient({
    account,
    chain: getChainFromLocalStorage(chain),
    transport: getTransportFromLocalStorage(chain),
  });

  const user = await getPublicClient(chain).readContract({
    address: factoryContract as Hex,
    abi: FACTORY_ABI,
    functionName: "getUser",
    args: [BigInt(id)],
  });

  if (user.account !== zeroAddress) {
    return Response?.json({ error: "User already exists" });
  }

  await walletClient.writeContract({
    address: factoryContract as Hex,
    abi: FACTORY_ABI,
    functionName: "saveUser",
    args: [BigInt(id), pubKey],
  });

  const smartWalletAddress = await getPublicClient(chain).readContract({
    address: factoryContract as Hex,
    abi: FACTORY_ABI,
    functionName: "getAddress",
    args: [pubKey],
  });

  const transactionCount = await getPublicClient(chain).getTransactionCount({
    address: "0x9eC80B438e5DCE70123541311290aA6c1e197d21",
  });
  await walletClient.sendTransaction({
    to: smartWalletAddress,
    value: BigInt(1),
    nonce: transactionCount + 1,
  });

  const createdUser = {
    id,
    account: smartWalletAddress,
    pubKey,
  };

  return Response.json(createdUser);
}

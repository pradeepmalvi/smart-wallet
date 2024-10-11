import { getChainFromLocalStorage, getPublicClient, getTransportFromLocalStorage} from "@/constants";
import { FACTORY_ABI } from "@/constants/factory";
import { Hex, createWalletClient, toHex, zeroAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export async function POST(req: Request) {
  const { id, pubKey, chain } = (await req.json()) as { id: Hex; pubKey: [Hex, Hex], chain: string };

  const privateKey =  chain === "Ethereum" ? process.env.RELAYER_PRIVATE_KEY_ETHEREUM : process.env.RELAYER_PRIVATE_KEY_POLYGON;
  const factoryContract =  chain === "Ethereum" ? process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ADDRESS_ETHEREUM : process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ADDRESS_POLYGON;

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

  await walletClient.sendTransaction({
    to: smartWalletAddress,
    value: BigInt(1),
  });
  
  const createdUser = {
    id,
    account: smartWalletAddress,
    pubKey,
  };
  
  return Response.json(createdUser);
}

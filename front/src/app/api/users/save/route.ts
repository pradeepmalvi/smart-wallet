import {
  getChainFromLocalStorage,
  getFactoryContract,
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

  console.log( { id, pubKey, chain })
  

  const privateKey = process.env.RELAYER_PRIVATE_KEY;
  const factoryContract = getFactoryContract(chain);

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

  console.log('here0', user)

  if (user.account !== zeroAddress) {
    return Response?.json({ error: "User already exists" });
  }

  console.log('here1')
  await walletClient.writeContract({
    address: factoryContract as Hex,
    abi: FACTORY_ABI,
    functionName: "saveUser",
    args: [BigInt(id), pubKey],
  });

  console.log('here2')

  const smartWalletAddress = await getPublicClient(chain).readContract({
    address: factoryContract as Hex,
    abi: FACTORY_ABI,
    functionName: "getAddress",
    args: [pubKey],
  });

  console.log('here3', smartWalletAddress)

  await walletClient.sendTransaction({
    to: smartWalletAddress,
    value: BigInt(1)
  });

  const createdUser = {
    id,
    account: smartWalletAddress,
    pubKey,
  };

  return Response.json(createdUser);
}

import { getBalance, getFactoryContract, getPublicClient } from "@/constants/client";
import { FACTORY_ABI } from "@/constants/factory";
import { Hex, stringify, toHex } from "viem";

export async function GET(_req: Request, { params }: { params: { id: Hex } }) {
  const url = new URL(_req.url);
  const chain = url.searchParams.get('chain') || '';
  const { id } = params;

  if (!id) {
    return Response.json({ error: "id is required" });
  }

  if (!chain) {
    return Response.json({ error: "chain is required" });
  }

  const contractAddress = getFactoryContract(chain);

  console.log('id', id)
  console.log('BigInt', [BigInt(id)])
  const user = await getPublicClient(chain).readContract({
    address: contractAddress as `0x${string}`,
    abi: FACTORY_ABI,
    functionName: "getUser",
    args: [BigInt(id)],
  });

  console.log('user', user)

  let balance = BigInt(0);
  
  if (user?.account) {
    const apiUrl = getBalance(chain, user.account);
    const result = await fetch(apiUrl, { cache: "no-store" });
    const resultJSON = await result.json();
    balance = BigInt(resultJSON?.result || 0);
  }

  return Response.json(JSON.parse(stringify({ ...user, id: toHex(user.id), balance })));
}

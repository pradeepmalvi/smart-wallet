import { getPublicClient } from "@/constants/client";
import { FACTORY_ABI } from "@/constants/factory";
import { Hex, stringify, toHex } from "viem";

export async function GET(_req: Request, { params }: { params: { id: Hex } }) {
  const url = new URL(_req.url);
  const chain = url.searchParams.get('chain') || '';
  const { id } = params;

  if (!id) {
    return Response.json(JSON.parse(stringify({ error: "id is required" })));
  }

  const contractAddress = chain === "Ethereum" ? process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ADDRESS_ETHEREUM : process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ADDRESS_POLYGON;
  
  if (!chain) {
    return Response.json(JSON.parse(stringify({ error: "chain is required" })));
  }

  const user = await getPublicClient(chain).readContract({
    address: contractAddress as `0x${string}`,
    abi: FACTORY_ABI,
    functionName: "getUser",
    args: [BigInt(id)],
  });
  
  //const balance = await PUBLIC_CLIENT.getBalance({ address: user.account });
  let balance = BigInt(0);

  // Using etherscan api instead of getBalance as Sepolia rcp node is not inconsistent
  if (user?.account) {
    const apiUrl = chain === "Ethereum"
      ? `https://api-sepolia.etherscan.io/api?module=account&action=balance&address=${user.account}&tag=latest&apikey=${process.env.ETHERSCAN_API_KEY_ETHEREUM}`
      : `https://api-amoy.polygonscan.com/api?module=account&action=balance&address=${user.account}&tag=latest&apikey=${process.env.POLYGONSCAN_API_KEY_POLYGON}`;

    const result = await fetch(apiUrl, { cache: "no-store" });
    const resultJSON = await result.json();
    balance = BigInt(resultJSON?.result || 0);
  }

  return Response.json(JSON.parse(stringify({ ...user, id: toHex(user.id), balance })));
}

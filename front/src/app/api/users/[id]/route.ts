import { getPublicClient } from "@/constants/client";
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

  const contractAddresses: Record<string, string | undefined> = {
    Ethereum: process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ADDRESS_ETHEREUM,
    Polygon: process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ADDRESS_POLYGON,
    Binance: process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ADDRESS_BINANCE,
  };

  const contractAddress = contractAddresses[chain] || process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ADDRESS_ETHEREUM;

  const user = await getPublicClient(chain).readContract({
    address: contractAddress as `0x${string}`,
    abi: FACTORY_ABI,
    functionName: "getUser",
    args: [BigInt(id)],
  });

  let balance = BigInt(0);

  if (user?.account) {
    const apiUrls: Record<string, string> = {
      Ethereum: `${process.env.NEXT_PUBLIC_ETHERSCAN_API_URL_ETHEREUM}?module=account&action=balance&address=${user.account}&tag=latest&apikey=${process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY_ETHEREUM}`,
      Polygon: `${process.env.NEXT_PUBLIC_POLYGONSCAN_API_URL_POLYGON}?module=account&action=balance&address=${user.account}&tag=latest&apikey=${process.env.NEXT_PUBLIC_POLYGONSCAN_API_KEY_POLYGON}`,
      Binance: `${process.env.NEXT_PUBLIC_BINANCESCAN_API_URL_BINANCE}?module=account&action=balance&address=${user.account}&tag=latest&apikey=${process.env.NEXT_PUBLIC_BINANCESCAN_API_KEY_BINANCE}`,
    };

    const apiUrl = apiUrls[chain];
    const result = await fetch(apiUrl, { cache: "no-store" });
    const resultJSON = await result.json();
    balance = BigInt(resultJSON?.result || 0);
  }

  return Response.json(JSON.parse(stringify({ ...user, id: toHex(user.id), balance })));
}

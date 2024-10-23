import { Hex, stringify } from "viem";

export async function GET(_req: Request, { params }: { params: { address: Hex, chain: string } }) {
  const { address } = params;
  const { searchParams } = new URL(_req.url);
  const chain = searchParams.get('chain');
  if (!address) {
    return Response.json(JSON.parse(stringify({ error: "address is required" })));
  }

  const apiUrls: Record<string, string> = {
    Ethereum: `${process.env.NEXT_PUBLIC_ETHERSCAN_API_URL_ETHEREUM}?module=account&action=balance&address=${address}&tag=latest&apikey=${process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY_ETHEREUM}`,
    Polygon: `${process.env.NEXT_PUBLIC_POLYGONSCAN_API_URL_POLYGON}?module=account&action=balance&address=${address}&tag=latest&apikey=${process.env.NEXT_PUBLIC_POLYGONSCAN_API_KEY_POLYGON}`,
    Binance: `${process.env.NEXT_PUBLIC_BINANCESCAN_API_URL_BINANCE}?module=account&action=balance&address=${address}&tag=latest&apikey=${process.env.NEXT_PUBLIC_BINANCESCAN_API_KEY_BINANCE}`,
  };

  if (!chain) {
    return Response.json(JSON.parse(stringify({ error: "chain is required" })));
  }
  const apiUrl = apiUrls[chain];

  const result = await fetch(apiUrl, { cache: "no-store" });
  
  const resultJSON = await result.json();
  const balance = BigInt(resultJSON?.result || 0);

  return Response.json(JSON.parse(stringify({ balance })));
}

import { Hex, stringify } from "viem";

export async function GET(_req: Request, { params }: { params: { address: Hex, chain: string } }) {
  const { address } = params;
  const { searchParams } = new URL(_req.url);
  const chain = searchParams.get('chain');
  if (!address) {
    return Response.json(JSON.parse(stringify({ error: "address is required" })));
  }

  const apiUrl = chain === "Ethereum"
  ? `https://api-sepolia.etherscan.io/api?module=account&action=balance&address=${address}&tag=latest&apikey=${process.env.ETHERSCAN_API_KEY_ETHEREUM}`
  : `https://api-amoy.polygonscan.com/api?module=account&action=balance&address=${address}&tag=latest&apikey=${process.env.POLYGONSCAN_API_KEY_POLYGON}`;

  const result = await fetch(apiUrl, { cache: "no-store" });
  
  const resultJSON = await result.json();
  const balance = BigInt(resultJSON?.result || 0);

  return Response.json(JSON.parse(stringify({ balance })));
}

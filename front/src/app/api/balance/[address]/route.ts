import { getBalance } from "@/constants";
import { get } from "http";
import { Hex, stringify } from "viem";

export async function GET(_req: Request, { params }: { params: { address: Hex, chain: string } }) {
  const { address } = params;
  const { searchParams } = new URL(_req.url);
  const chain = searchParams.get('chain');
  if (!address) {
    return Response.json(JSON.parse(stringify({ error: "address is required" })));
  }


  if (!chain) {
    return Response.json(JSON.parse(stringify({ error: "chain is required" })));
  }
  const apiUrl = getBalance(chain, address);

  const result = await fetch(apiUrl, { cache: "no-store" });
  
  const resultJSON = await result.json();
  const balance = BigInt(resultJSON?.result || 0);

  return Response.json(JSON.parse(stringify({ balance })));
}

import { Address, Hex } from "viem";

export type User = { id: Hex; pubKey: { x: Hex; y: Hex }; account: Address; balance: bigint };

export async function getBalance(address: Hex, chain: String): Promise<{ balance: bigint }> {
  const response = await fetch(`/api/balance/${address}?chain=${chain}`, {
    method: "GET",
  });

  const user = await response.json();
  return {
    balance: user.balance,
  };
}

import { Hex } from "viem";
import { User } from "./getUser";

export async function saveUser({
  id,
  pubKey,
  chain
}: {
  id: Hex;
  pubKey: { x: Hex; y: Hex };
  chain: string;
}): Promise<Omit<User, "balance">> {
  const response = await fetch("/api/users/save", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id, pubKey: [pubKey.x, pubKey.y], chain }),
  });

  const res: Omit<User, "balance"> = await response.json();

  return res;
}

import { createPublicClient, http } from "viem";
import { sepolia, mainnet, polygonAmoy } from "viem/chains";

export const CHAIN = {
  ...polygonAmoy,
};

export const transport = http(process.env.NEXT_PUBLIC_RPC_ENDPOINT);

export const PUBLIC_CLIENT = createPublicClient({
  chain: polygonAmoy,
  transport,
});

export const MAINNET_PUBLIC_CLIENT = createPublicClient({
  chain: mainnet,
  transport: http(),
});

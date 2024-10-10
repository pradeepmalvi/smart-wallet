import { createPublicClient, http } from "viem";
import { sepolia, mainnet, polygonAmoy } from "viem/chains";

export const getChainFromLocalStorage = (chain:String) => {
  if (chain === "Ethereum") {
    return { ...sepolia };
  }
  return { ...polygonAmoy };
};

export const getTransportFromLocalStorage = (chain:String) => {
  if (chain === "Ethereum") {
    return http(process.env.NEXT_PUBLIC_RPC_ENDPOINT_ETHEREUM);
  }
  return http(process.env.NEXT_PUBLIC_RPC_ENDPOINT_POLYGON);
};

export const getPublicClient = (chain:String) => {
  return createPublicClient({
    chain: getChainFromLocalStorage(chain),
    transport: getTransportFromLocalStorage(chain),
  });
}

export const MAINNET_PUBLIC_CLIENT = createPublicClient({
  chain: mainnet,
  transport: http(),
});

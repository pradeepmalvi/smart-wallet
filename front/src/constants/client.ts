import { createPublicClient, http } from "viem";
import {
  sepolia,
  mainnet,
  polygonAmoy,
  bscTestnet,
  arbitrumSepolia,
  optimismSepolia,
} from "viem/chains";

export const getChainFromLocalStorage = (chain: string) => {
  switch (chain) {
    case "Ethereum":
      return { ...sepolia };
    case "Polygon":
      return { ...polygonAmoy };
    case "Binance":
      return { ...bscTestnet };
    case "Arbitrum":
      return { ...arbitrumSepolia };
    case "Optimism":
      return { ...optimismSepolia };
    default:
      return { ...sepolia };
  }
};
export const getTransportFromLocalStorage = (chain: string) => {
  const endpoints: { [key: string]: string | undefined } = {
    Ethereum: process.env.NEXT_PUBLIC_RPC_ENDPOINT_ETHEREUM,
    Polygon: process.env.NEXT_PUBLIC_RPC_ENDPOINT_POLYGON,
    Binance: process.env.NEXT_PUBLIC_RPC_ENDPOINT_BINANCE,
  };

  return http(endpoints[chain] || process.env.NEXT_PUBLIC_RPC_ENDPOINT_ETHEREUM);
};

export const getPublicClient = (chain: string) => {
  return createPublicClient({
    chain: getChainFromLocalStorage(chain),
    transport: getTransportFromLocalStorage(chain),
  });
};

export const MAINNET_PUBLIC_CLIENT = createPublicClient({
  chain: mainnet,
  transport: http(),
});

import { fallback, http } from "viem";

const getStackUpBundlerRpcUrl = () => {
  const chain = localStorage.getItem("chain") || "Ethereum";
  const url: { [key: string]: string | undefined } = {
    Ethereum: process.env.NEXT_PUBLIC_RPC_ENDPOINT_ETHEREUM,
    Polygon: process.env.NEXT_PUBLIC_RPC_ENDPOINT_POLYGON,
    Binance: process.env.NEXT_PUBLIC_RPC_ENDPOINT_BINANCE,
  };

  const mainURL = url[chain] || process.env.NEXT_PUBLIC_RPC_ENDPOINT_ETHEREUM;
  return http(mainURL);
};

export const transport = getStackUpBundlerRpcUrl();

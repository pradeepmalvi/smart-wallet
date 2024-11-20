import { getRpcEndpoint } from "@/constants";
import { fallback, http } from "viem";

const getStackUpBundlerRpcUrl = () => {
  const chain = localStorage.getItem("chain") || "Ethereum";

  const mainURL = getRpcEndpoint(chain) || process.env.NEXT_PUBLIC_RPC_ENDPOINT_ETHEREUM;
  return mainURL;
};

export const transport = getStackUpBundlerRpcUrl();

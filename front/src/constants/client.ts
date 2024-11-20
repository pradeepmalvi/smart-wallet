import { createPublicClient, http } from "viem";
import {
  sepolia,
  mainnet,
  polygonAmoy,
  bscTestnet,
  arbitrumSepolia,
  optimismSepolia,
} from "viem/chains";

export const allNetwork = [
  {
    name: "Ethereum",
    testnet: "Sepolia",
    explorerName: "Etherscan",
    nativeToken: "ETH",
    decimals: 18,
    chainId: 1,
    chain: sepolia,
    rpc: process.env.NEXT_PUBLIC_RPC_ENDPOINT_ETHEREUM,
    factoryContract: process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ADDRESS_ETHEREUM,
    explorerKey: process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY_ETHEREUM,
    explorerUrl: process.env.NEXT_PUBLIC_ETHERSCAN_URL_ETHEREUM,
    explorerApiUrl: process.env.NEXT_PUBLIC_ETHERSCAN_API_URL_ETHEREUM,
    getBalance: (address: string) =>
      `${process.env.NEXT_PUBLIC_ETHERSCAN_API_URL_ETHEREUM}?module=account&action=balance&address=${address}&tag=latest&apikey=${process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY_ETHEREUM}`,
  },
  {
    name: "Polygon",
    testnet: "Amoy",
    explorerName: "Polygonscan",
    nativeToken: "POL",
    decimals: 18,
    chainId: 137,
    chain: polygonAmoy,
    rpc: process.env.NEXT_PUBLIC_RPC_ENDPOINT_POLYGON,
    factoryContract: process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ADDRESS_POLYGON,
    explorerKey: process.env.NEXT_PUBLIC_POLYGONSCAN_API_KEY_POLYGON,
    explorerUrl: process.env.NEXT_PUBLIC_POLYGONSCAN_URL_POLYGON,
    explorerApiUrl: process.env.NEXT_PUBLIC_POLYGONSCAN_API_URL_POLYGON,
    getBalance: (address: string) =>
      `${process.env.NEXT_PUBLIC_POLYGONSCAN_API_URL_POLYGON}?module=account&action=balance&address=${address}&tag=latest&apikey=${process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY_POLYGON}`,
  },
  // {
  //   name: "BSC",
  //   testnet: "Testnet",
  //   explorerName: "BscScan",
  //   nativeToken: "BNB",
  //   decimals: 18,
  //   chainId: 56,
  //   chain: bscTestnet,
  //   rpc: process.env.NEXT_PUBLIC_RPC_ENDPOINT_BINANCE,
  //   factoryContract: process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ADDRESS_BINANCE,
  //   explorerKey: process.env.NEXT_PUBLIC_BINANCESCAN_API_KEY_BINANCE,
  //   explorerUrl: process.env.NEXT_PUBLIC_BINANCESCAN_URL_BINANCE,
  //   getBalance: (address: string) =>
  //     `${process.env.NEXT_PUBLIC_BINANCESCAN_API_URL_BINANCE}?module=account&action=balance&address=${address}&tag=latest&apikey=${process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY_BINANCE}`,
  // },
  {
    name: "Arbitrum",
    testnet: "Sepolia",
    explorerName: "Arbiscan",
    nativeToken: "ETH",
    decimals: 18,
    chainId: 42161,
    chain: arbitrumSepolia,
    rpc: process.env.NEXT_PUBLIC_RPC_ENDPOINT_ARBITRUM,
    factoryContract: process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ADDRESS_ARBITRUM,
    explorerKey: process.env.NEXT_PUBLIC_ARBITRUMSCAN_API_KEY_ARBITRUM,
    explorerUrl: process.env.NEXT_PUBLIC_ARBITRUMSCAN_URL_ARBITRUM,
    explorerApiUrl: process.env.NEXT_PUBLIC_ARBITRUMSCAN_API_URL_ARBITRUM,
    getBalance: (address: string) =>
      `${process.env.NEXT_PUBLIC_ARBITRUMSCAN_API_URL_ARBITRUM}?module=account&action=balance&address=${address}&tag=latest&apikey=${process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY_ARBITRUM}`,
  },
  {
    name: "Optimism",
    testnet: "Sepolia",
    explorerName: "Optimistic Etherscan",
    nativeToken: "ETH",
    decimals: 18,
    chainId: 10,
    chain: optimismSepolia,
    rpc: process.env.NEXT_PUBLIC_RPC_ENDPOINT_OPTIMISM,
    factoryContract: process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ADDRESS_OPTIMISM,
    explorerKey: process.env.NEXT_PUBLIC_OPTIMISMSCAN_API_KEY_OPTIMISM,
    explorerUrl: process.env.NEXT_PUBLIC_OPTIMISMSCAN_URL_OPTIMISM,
    explorerApiUrl: process.env.NEXT_PUBLIC_OPTIMISMSCAN_API_URL_OPTIMISM,
    getBalance: (address: string) =>
      `${process.env.NEXT_PUBLIC_OPTIMISMSCAN_API_URL_OPTIMISM}?module=account&action=balance&address=${address}&tag=latest&apikey=${process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY_OPTIMISM}`,
  },
];

export const getNetworkWithTestnetName = (chain: string) => {
  const network = allNetwork.find((network) => network.name === chain);
  return `${network?.name} ${network?.testnet}` || "";
};

export const getExplorerName = (chain: string) => {
  const network = allNetwork.find((network) => network.name === chain);
  return network?.explorerName || "";
};

export const getNativeToken = (chain: string) => {
  const network = allNetwork.find((network) => network.name === chain);
  return network?.nativeToken || "";
};

export const getFactoryContract = (chain: string) => {
  const network = allNetwork.find((network) => network.name === chain);
  return network?.factoryContract || process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ADDRESS_ETHEREUM;
};

export const getRpcEndpoint = (chain: string) => {
  const network = allNetwork.find((network) => network.name === chain);
  return http(network?.rpc || process.env.NEXT_PUBLIC_RPC_ENDPOINT_ETHEREUM);
};

export const getChainFromLocalStorage = (chain: string) => {
  const network = allNetwork.find((network) => network.name === chain);
  return network ? network.chain : sepolia;
};

export const getExplorerKey = (chain: string) => {
  const network = allNetwork.find((network) => network.name === chain);
  return network?.explorerKey || process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY_ETHEREUM;
};

export const getExplorerUrl = (chain: string) => {
  const network = allNetwork.find((network) => network.name === chain);
  return network?.explorerUrl || process.env.NEXT_PUBLIC_ETHERSCAN_URL_ETHEREUM;
};

export const getExplorerApiUrl = (chain: string) => {
  const network = allNetwork.find((network) => network.name === chain);
  return network?.explorerApiUrl || process.env.NEXT_PUBLIC_ETHERSCAN_API_URL_ETHEREUM;
}

export const getBalance = (chain: string, address: string) => {
  return (`${getExplorerApiUrl(chain)}?module=account&action=balance&address=${address}&tag=latest&apikey=${getExplorerKey(chain)}`
  );
};

export const getTransportFromLocalStorage = (chain: string) => {
  const network = allNetwork.find((network) => network.name === chain);
  return http(network?.rpc || process.env.NEXT_PUBLIC_RPC_ENDPOINT_ETHEREUM);
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

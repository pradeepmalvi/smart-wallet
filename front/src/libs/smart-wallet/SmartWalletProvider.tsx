"use client";

import React, { useContext } from "react";
import { useSmartWalletHook } from "@/libs/smart-wallet/hook/useSmartWalletHook";
import { WagmiConfig, createConfig, http } from "wagmi";
import { mainnet, sepolia, polygonAmoy } from 'wagmi/chains'
import { CHAIN } from "@/constants";

type UseSmartWallet = ReturnType<typeof useSmartWalletHook>;

const SmartWalletContext = React.createContext<UseSmartWallet | null>(null);
export const useWalletConnect = (): UseSmartWallet => {
  const context = useContext(SmartWalletContext);
  if (!context) {
    throw new Error("useSmartWalletHook must be used within a SmartWalletProvider");
  }
  return context;
};

export function SmartWalletProvider({ children }: { children: React.ReactNode }) {
  const smartWalletValue = useSmartWalletHook();

  // const { publicClient } = configureChains([CHAIN], [publicProvider()]);

  const config = createConfig({
    chains: [mainnet, sepolia, polygonAmoy], 
    transports: { 
      [mainnet.id]: http(), 
      [sepolia.id]: http(), 
      [polygonAmoy.id]: http(), 
    }, 
  })


  // const wagmiConfig = createConfig({
  //   autoConnect: true,
  //   publicClient: publicClient,
  // });

  return (
    <WagmiConfig config={config}>
      <SmartWalletContext.Provider value={smartWalletValue}>{children}</SmartWalletContext.Provider>
    </WagmiConfig>
  );
}

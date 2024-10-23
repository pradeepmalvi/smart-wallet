"use client";

import React, { useState, useEffect, CSSProperties } from "react";
import { useBalance } from "@/providers/BalanceProvider";
import { useMe } from "@/providers/MeProvider";
import { PaperPlaneIcon, Cross2Icon } from "@radix-ui/react-icons";
import { Flex, Text, Button } from "@radix-ui/themes";
import { createPublicClient, http } from "viem";
import { mainnet, sepolia, polygonAmoy, bscTestnet, arbitrumSepolia } from "viem/chains";
import { formatUnits } from "viem/utils";
import { useModal } from "@/providers/ModalProvider";
import SendTokenTxModal from "../SendERC20TxModal";

const css: CSSProperties = {
  padding: "1rem 0",
};

const getChain = () => {
  const chain = localStorage.getItem("chain");
  switch (chain) {
    case "Ethereum":
      return sepolia;
    case "Polygon":
      return polygonAmoy;
    case "Binance":
      return bscTestnet;
    default:
      return sepolia;
  }
};

const getRpcEndpoint = () => {
  const chain = localStorage.getItem("chain");
  switch (chain) {
    case "Ethereum":
      return http(process.env.NEXT_PUBLIC_RPC_ENDPOINT_ETHEREUM);
    case "Polygon":
      return http(process.env.NEXT_PUBLIC_RPC_ENDPOINT_POLYGON);
    case "Binance":
      return http(process.env.NEXT_PUBLIC_RPC_ENDPOINT_BINANCE);
    default:
      return http(process.env.NEXT_PUBLIC_RPC_ENDPOINT_ETHEREUM);
  }
};

const client = createPublicClient({
  chain: getChain(),
  transport: getRpcEndpoint(),
});

const ERC20_ABI = [
  {
    inputs: [
      { internalType: "string", name: "name", type: "string" },
      { internalType: "string", name: "symbol", type: "string" },
      { internalType: "uint8", name: "decimals", type: "uint8" },
      { internalType: "address", name: "owner", type: "address" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "owner", type: "address" },
      { indexed: true, internalType: "address", name: "spender", type: "address" },
      { indexed: false, internalType: "uint256", name: "value", type: "uint256" },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "previousOwner", type: "address" },
      { indexed: true, internalType: "address", name: "newOwner", type: "address" },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "from", type: "address" },
      { indexed: true, internalType: "address", name: "to", type: "address" },
      { indexed: false, internalType: "uint256", name: "value", type: "uint256" },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    inputs: [],
    name: "DOMAIN_SEPARATOR",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "EIP712_REVISION",
    outputs: [{ internalType: "bytes", name: "", type: "bytes" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "PERMIT_TYPEHASH",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "subtractedValue", type: "uint256" },
    ],
    name: "decreaseAllowance",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "addedValue", type: "uint256" },
    ],
    name: "increaseAllowance",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" },
    ],
    name: "mint",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "value", type: "uint256" }],
    name: "mint",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "nonces",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "uint8", name: "v", type: "uint8" },
      { internalType: "bytes32", name: "r", type: "bytes32" },
      { internalType: "bytes32", name: "s", type: "bytes32" },
    ],
    name: "permit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "sender", type: "address" },
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "transferFrom",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

interface TokenBalanceProps {
  token: string;
}

const TokenBalance = ({ token }: TokenBalanceProps) => {
  const { open } = useModal();
  const { me } = useMe();
  const [tokenBalance, setTokenBalance] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState<string>("");
  const [tokenDecimal, setTokenDecimal] = useState<number>(18);
  let [intBalance, decimals] = tokenBalance.toString().split(".");

  const tokenContractAddress = token;
  const smartContractWalletAddress = me?.account;

  useEffect(() => {
    const fetchTokenBalance = async () => {
      if (!tokenContractAddress) {
        console.error("Token contract address is not defined");
        return;
      }

      const decimals = await client.readContract({
        address: tokenContractAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "decimals",
      });

      const symbol = await client.readContract({
        address: tokenContractAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "symbol",
      });

      const balance = await client.readContract({
        address: tokenContractAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [smartContractWalletAddress],
      });

      const tokenBalance = formatUnits(balance as bigint, decimals as number);

      setTokenBalance(tokenBalance);
      setTokenSymbol(symbol as string);
      setTokenDecimal(decimals as number);
    };

    fetchTokenBalance();
  }, []);

  const removeToken = () => {
    
    const userAddresses = JSON.parse(localStorage.getItem("userAddresses") || "[]");
    const updatedUserAddresses = userAddresses.map((userAddress: { address: string; tokenAddresses: { token: string }[] }) => {
      return me && userAddress.address === me.account
        ? {
            ...userAddress,
            tokenAddresses: userAddress.tokenAddresses.filter((tokenAddress) => tokenAddress.token !== token),
          }
        : userAddress;
    });
    localStorage.setItem("userAddresses", JSON.stringify(updatedUserAddresses));
    window.location.reload();
  };

  return (
    <>
      <Flex style={css} direction="row" justify="center">
        <Text highContrast={true} weight="bold" size="9">
          {intBalance}.{(decimals || "00").slice(0, 4)}
        </Text>
        <Text highContrast={true} weight="bold" size="6" style={{ color: "var(--accent-12)" }}>
          {tokenSymbol}
        </Text>
      </Flex>

      <Flex style={{ marginBottom: "20px" }}>
        <Button
          size="3"
          variant="outline"
          style={{
            flexGrow: 10000,
            display: "flex",
            alignItems: "center",
          }}
          onClick={() => {
            open(
              <SendTokenTxModal
                type="Token"
                token={token}
                symbol={tokenSymbol}
                decimal={tokenDecimal}
              />,
            );
          }}
        >
          Send {tokenSymbol}
          <PaperPlaneIcon />
        </Button>
        <Button
          size="3"
          variant="outline"
          style={{
            flexGrow: 1,
            display: "flex",
            alignItems: "center",
            marginLeft: "1rem",
          }}
          onClick={removeToken}
        >
          <Cross2Icon/>
        </Button>
      </Flex>
    </>
  );
};

export default TokenBalance;

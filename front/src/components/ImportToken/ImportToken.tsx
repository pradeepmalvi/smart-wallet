"use client";

import { Chain, EstimateFeesPerGasReturnType, Hash, Hex, parseEther } from "viem";
import { smartWallet } from "@/libs/smart-wallet";
import { useEffect, useRef, useState } from "react";
import { Flex, Link, Button, Heading, Text, TextField, Callout } from "@radix-ui/themes";
import {
  CheckCircledIcon,
  CrossCircledIcon,
  ExternalLinkIcon,
  InfoCircledIcon,
} from "@radix-ui/react-icons";
import { useMe } from "@/providers/MeProvider";
import Spinner from "../Spinner";
import { MAINNET_PUBLIC_CLIENT } from "@/constants";
import { normalize } from "viem/ens";


export default function ImportToken() {
  const [txReceipt, setTxReceipt] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [userInputDestination, setUserInputDestination] = useState("");
  const [userInputAmount, setUserInputAmount] = useState("");
  const [isBelowBalance, setIsBelowBalance] = useState(false);
  const [ensIsLoading, setEnsIsLoading] = useState(false);
  const [destination, setDestination] = useState("");
  const { me } = useMe();

  const addressInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    smartWallet.init(localStorage.getItem("chain") as string);
    const input = addressInputRef.current as HTMLInputElement;
    if (!input) return;
    if (userInputDestination.endsWith(".eth") && !destination) {
      input.setCustomValidity("We didn't find any address associated with this ENS name");
      return;
    }
    input.setCustomValidity("");
  }, [userInputDestination, destination]);

  function handleUserInputDestination(e: any) {
    const value = e.target.value;
    setDestination("");
    setUserInputDestination(value);
    resolveUserInputDestination(value);
  }

  async function resolveUserInputDestination(value: string) {
    if (!value) {
      setDestination("");
      return;
    }

    if (value.match(/^0x[a-fA-F0-9]{40}$/)) {
      setDestination(value);
      try {
        setEnsIsLoading(true);
        const name = await MAINNET_PUBLIC_CLIENT.getEnsName({
          address: normalize(value) as Hash,
        });
        if (name) {
          setUserInputDestination(name);
        }
      } finally {
        setEnsIsLoading(false);
        return;
      }
    }

    if (value.endsWith(".eth")) {
      setEnsIsLoading(true);
      try {
        const address = await MAINNET_PUBLIC_CLIENT.getEnsAddress({
          name: normalize(value),
        });
        address ? setDestination(address) : setDestination("");
      } finally {
        setEnsIsLoading(false);
        return;
      }
    }
    setDestination("");
  }

  const importToken = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value = userInputDestination;

    if (!value) {
      return;
    }

    const userAddresses = JSON.parse(localStorage.getItem("userAddresses") || "[]");

    if (!userAddresses?.length) {
      const userAddress = {
        address: me?.account,
        tokenAddresses: [
          {
            network: localStorage.getItem("chain"),
            token: value,
          },
        ],
      };
      userAddresses.push(userAddress);
    } else {
      const userAddress = userAddresses.find((address: { address: string; tokenAddresses: { network: string | null; token: string; }[] }) => address.address === me?.account);
      if (userAddress) {
        const token = userAddress.tokenAddresses.find((token: { network: string | null; token: string }) => token.token === value);
        if (!token) {
          userAddress.tokenAddresses.push({
            network: localStorage.getItem("chain"),
            token: value,
          });
        }
      } else {
        const userAddress = {
          address: me?.account,
          tokenAddresses: [
            {
              network: localStorage.getItem("chain"),
              token: value,
            },
          ],
        };
        userAddresses.push(userAddress);
      }
    }
    
    localStorage.setItem("userAddresses", JSON.stringify(userAddresses) );
    window.location.reload();
  };

  if (isLoading)
    return (
      <Flex direction="column" justify="center" align="center" grow="1" gap="5">
        <Spinner style={{ margin: 0 }} />
        <Text size="2">Sending transaction...</Text>
      </Flex>
    );

  if (txReceipt && !isLoading)
    return (
      <>
        <Flex direction="column" justify="center" align="center" grow="1" gap="5">
          {true ? (
            <>
              <CheckCircledIcon height="32" width="100%" color="var(--teal-11)" />
              <Link
                href={`https://sepolia.etherscan.io/tx/${txReceipt?.receipt?.transactionHash}`}
                target="_blank"
                style={{ textDecoration: "none" }}
              >
                <Flex direction="row" gap="2">
                  <Text size="2">See transaction</Text>
                  <ExternalLinkIcon style={{ alignSelf: "center", color: "var(--teal-11)" }} />
                </Flex>
              </Link>
            </>
          ) : (
            <>
              <CrossCircledIcon height="32" width="100%" />
              <Link
                href={`https://sepolia.etherscan.io/tx/${txReceipt?.receipt?.transactionHash}`}
                target="_blank"
                style={{ textDecoration: "none" }}
              >
                <Flex direction="row" gap="2" style={{ color: "var(--gray-12)" }}>
                  <Text size="2">Transaction reverted</Text>
                  <ExternalLinkIcon style={{ alignSelf: "center" }} />
                </Flex>
              </Link>
            </>
          )}
        </Flex>
      </>
    );

  return (
    <Flex direction="column" style={{ flexGrow: 1, width: "100%" }} gap="5">
      {!txReceipt && !isLoading && (
        <Heading as="h2" size={"8"} style={{ color: "var(--accent-9)" }}>
          Import Token
        </Heading>
      )}
      {!txReceipt && !isLoading && (
        <form
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            flexGrow: 1,
          }}
          onSubmit={(e) => importToken(e)}
        >
          <Flex direction="column">
            <Flex direction="column">
              <div
                style={{
                  marginBottom: "1rem",
                }}
              >
                <Flex direction="column" gap="1">
                  <Flex direction="row" justify="between" gap="2"></Flex>

                  <TextField.Root>
                    <TextField.Slot style={{ color: "var(--accent-11)", paddingLeft: "1rem" }}>
                      Token:
                    </TextField.Slot>
                    <TextField.Input
                      ref={addressInputRef}
                      required
                      placeholder="Token contract address"
                      value={userInputDestination}
                      onChange={handleUserInputDestination}
                    />
                  </TextField.Root>
                </Flex>
              </div>
            </Flex>
          </Flex>

          <Flex direction={"column"} gap="3">
            {error && (
              <Callout.Root
                style={{ maxHeight: "150px", overflowY: "scroll", wordBreak: "break-word" }}
              >
                <Callout.Icon>
                  <InfoCircledIcon />
                </Callout.Icon>
                <Callout.Text>{error}</Callout.Text>
              </Callout.Root>
            )}
            <Button variant="outline" size="3" type="submit">
              IMPORT TOKEN
            </Button>
          </Flex>
        </form>
      )}
    </Flex>
  );
}

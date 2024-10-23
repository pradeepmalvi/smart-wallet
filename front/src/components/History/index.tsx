"use client";

import { Button, Flex, Callout } from "@radix-ui/themes";
import { useMe } from "@/providers/MeProvider";
import { ArrowRightIcon } from "@radix-ui/react-icons";
import LogoAnimatedLight from "../LogoAnimatedLight";

export default function History() {
  const { me } = useMe();
  const chain = localStorage.getItem("chain");

  return (
    <Callout.Root style={{ marginTop: "var(--space-4)" }}>
      <LogoAnimatedLight style={{ width: "60%", marginBottom: ".5rem" }} />
      <Callout.Text>
        You smart contract wallet is deployed during the first transaction that you make. You can
        still receive tokens and ETH on your smart contract wallet address in the meantime.
      </Callout.Text>
      <Flex direction="row" gap="1" justify="between">
        <Button
          size="2"
          variant="outline"
          style={{ marginTop: ".3rem" }}
          onClick={() => {
            if (chain === "Ethereum")
              window.open(
                `${process.env.NEXT_PUBLIC_ETHERSCAN_URL_ETHEREUM}/address/${me?.account}`,
                "_blank",
              );
            if (chain === "Polygon")
              window.open(
                `${process.env.NEXT_PUBLIC_POLYGONSCAN_URL_POLYGON}/address/${me?.account}`,
                "_blank",
              );
            if (chain === "Binance")
              window.open(
                `${process.env.NEXT_PUBLIC_BINANCESCAN_URL_BINANCE}/address/${me?.account}`,
                "_blank",
              );
          }}
        >
          Browse history on{" "}
            {(() => {
            switch (chain) {
              case "Ethereum":
              return "Etherscan";
              case "Polygon":
              return "Polygonscan";
              case "Binance":
              return "Binancescan";
              default:
              return "";
            }
            })()}
          <ArrowRightIcon />
        </Button>
      </Flex>
    </Callout.Root>
  );
}

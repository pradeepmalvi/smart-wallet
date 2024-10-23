"use client";

import { useBalance } from "@/providers/BalanceProvider";
import { Button, Flex, Text } from "@radix-ui/themes";
import { CSSProperties } from "react";
import SendTxModal from "../SendTxModal";
import { PaperPlaneIcon } from "@radix-ui/react-icons";
import { useModal } from "@/providers/ModalProvider";

const css: CSSProperties = {
  padding: "2rem 0 1rem 0",
};

export default function Balance() {
  const { open } = useModal();
  const { balance } = useBalance();
  let [intBalance, decimals] = balance.toString().split(".");

  const chain = localStorage.getItem("chain");
  const symbolMap: { [key: string]: string } = {
    Ethereum: "ETH",
    Polygon: "POL",
    Binance: "BNB",
  };
  const symbol = symbolMap[chain as keyof typeof symbolMap] || "";

  return (
    <>
      <Flex style={css} direction="row" justify="center">
        <Text highContrast={true} weight="bold" size="9">
          {intBalance}.{(decimals || "00").slice(0, 4)}
        </Text>
        <Text highContrast={true} weight="bold" size="6" style={{ color: "var(--accent-12)" }}>
          {symbol}
        </Text>
      </Flex>
      <Button
        size="3"
        variant="outline"
        style={{
          flexGrow: 1,
          display: "flex",
          alignItems: "center",
        }}
        onClick={() => open(<SendTxModal symbol={symbol} />)}
      >
        Send {symbol}
        <PaperPlaneIcon />
      </Button>
    </>
  );
}

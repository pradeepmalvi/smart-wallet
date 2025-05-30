"use client";

import { useBalance } from "@/providers/BalanceProvider";
import { Button, Flex, Text } from "@radix-ui/themes";
import { CSSProperties, useEffect, useState } from "react";
import SendTxModal from "../SendTxModal";
import { PaperPlaneIcon } from "@radix-ui/react-icons";
import { useModal } from "@/providers/ModalProvider";
import { getNativeToken } from "@/constants";

const css: CSSProperties = {
  padding: "2rem 0 1rem 0",
};

export default function Balance() {
  const { open } = useModal();
  const { balance } = useBalance();
  let [intBalance, decimals] = balance.toString().split(".");
  const [chain, setChain] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedChain = localStorage.getItem("chain");
      setChain(storedChain);
    }
  }, []);
  const symbol = getNativeToken(chain as string);

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

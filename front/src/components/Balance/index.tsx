"use client";

import { useBalance } from "@/providers/BalanceProvider";
import { Flex, Text } from "@radix-ui/themes";
import { CSSProperties } from "react";
import TokenBalance from "../TokenBalance";


const css: CSSProperties = {
  padding: "2rem 0 1rem 0",
};

export default function Balance() {
  const { balance } = useBalance();
  let [intBalance, decimals] = balance.toString().split(".");

  return (

      <Flex style={css} direction="row" justify="center">
        <Text highContrast={true} weight="bold" size="9">
          {intBalance}.{(decimals || "00").slice(0, 4)}
        </Text>
        <Text highContrast={true} weight="bold" size="6" style={{ color: "var(--accent-12)" }}>
          MATIC
        </Text>
      </Flex>
  );
}

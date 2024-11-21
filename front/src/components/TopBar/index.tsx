import { GearIcon } from "@radix-ui/react-icons";
import { Flex, IconButton, Text } from "@radix-ui/themes";
import Address from "../Address";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getNetworkWithTestnetName } from "@/constants";

export default function TopBar() {
  const [chain, setChain] = useState<string | null>(null);

  useEffect(() => {
    setChain(localStorage.getItem("chain"));
  }, []);

  return (
    <Flex width="100%" justify="between" align="center" style={{ position: "relative" }}>
      <Flex gap="2" align="center">
        <Address style={{ alignSelf: "center" }} />
      </Flex>

      <Link href="/settings">
        <IconButton variant="soft" size="3">
          <GearIcon />
        </IconButton>
      </Link>

      <Text
        size="1"
        style={{ color: "var(--gray-6)", position: "absolute", top: "2.5rem", left: "1.1rem" }}
      >
        on {getNetworkWithTestnetName(chain as string)}
      </Text>
    </Flex>
  );
}

"use client";

import { Button, Flex } from "@radix-ui/themes";
import { useModal } from "@/providers/ModalProvider";
import { PaperPlaneIcon, CornersIcon } from "@radix-ui/react-icons";
import QrReaderModal from "../QrReaderModal";
import SendTxModal from "../SendTxModal";
import SendERC20TxModal from "../SendERC20TxModal";
import Balance from "../Balance";
import TokenBalance from "../TokenBalance";

export default function NavBar() {
  const { open } = useModal();

  return (
    <Flex justify="center" direction="column" gap="4" style={{ marginInline: "2 rem" }}>
      <Balance />
      <Button
        size="3"
        variant="outline"
        style={{
          flexGrow: 1,
          display: "flex",
          alignItems: "center",
        }}
        onClick={() => open(<SendTxModal />)}
      >
        Send ETH
        <PaperPlaneIcon />
      </Button>
      <TokenBalance token={process.env.NEXT_PUBLIC_MT_TOKEN_ADDRESS} />
      <Button
        size="3"
        variant="outline"
        style={{
          flexGrow: 1,
          display: "flex",
          alignItems: "center",
        }}
        onClick={() => open(<SendERC20TxModal type="ERC20" token={process.env.NEXT_PUBLIC_MT_TOKEN_ADDRESS} symbol="MT"/>)}
      >
        Send MT
        <PaperPlaneIcon />
      </Button>

      <TokenBalance
        token={process.env.NEXT_PUBLIC_USDT_TOKEN_ADDRESS}
      />
      <Button
        size="3"
        variant="outline"
        style={{
          flexGrow: 1,
          display: "flex",
          alignItems: "center",
        }}
        onClick={() => open(<SendERC20TxModal type="ERC20" token={process.env.NEXT_PUBLIC_USDT_TOKEN_ADDRESS} symbol="USDT"/>)}
      >
        Send USDT
        <PaperPlaneIcon />
      </Button>
      <Button
        size="3"
        variant="outline"
        style={{
          flexGrow: 1,
          display: "flex",
          alignItems: "center",
        }}
        onClick={() => open(<QrReaderModal />)}
      >
        Connect a dApp
        <CornersIcon style={{ width: 20, height: 20 }} />
      </Button>
    </Flex>
  );
}

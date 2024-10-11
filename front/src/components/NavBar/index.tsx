"use client";

import { Button, Flex } from "@radix-ui/themes";
import { useModal } from "@/providers/ModalProvider";
import { CornersIcon, DownloadIcon } from "@radix-ui/react-icons";
import QrReaderModal from "../QrReaderModal";
import Balance from "../Balance";
import TokenBalance from "../TokenBalance";
import ImportToken from "../ImportToken/ImportToken";
import { useMe } from "@/providers/MeProvider";

export default function NavBar() {
  const { me } = useMe();
  const { open } = useModal();

  const userAddresses = JSON.parse(localStorage.getItem("userAddresses") || '[]');

  return (
    <Flex justify="center" direction="column" gap="4" style={{ marginInline: "2 rem" }}>
      <Balance />
      {userAddresses?.map(
        (userAddress: { address: string; tokenAddresses: { token: string; network: string }[] }) => {
          if (me && userAddress.address === me.account) {
            return userAddress.tokenAddresses.map((token) => {
              if (token.network === localStorage.getItem("chain")) {
                return <TokenBalance key={token.token} token={token.token} />;
              }
            });
          }
          return null;
        },
      )}

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
      <Button
        size="3"
        variant="outline"
        style={{
          flexGrow: 1,
          display: "flex",
          alignItems: "center",
        }}
        onClick={() => open(<ImportToken />)}
      >
        Import Token
        <DownloadIcon style={{ width: 20, height: 20 }} />
      </Button>
    </Flex>
  );
}

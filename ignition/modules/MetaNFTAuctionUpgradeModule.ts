import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

import MetaNFTAuctionModule from "./MetaNFTAuctionProxyModule.js";

const metaNFTAuctionUpgradeModule = buildModule(
  "MetaNFTAuctionUpgradeModule",
  (m) => {
    const proxyAdminOwner = m.getAccount(0);

    const { proxyAdmin, proxy } = m.useModule(MetaNFTAuctionModule);

    const auctionV2 = m.contract("MetaNFTAuctionV2");

    m.call(proxyAdmin, "upgradeAndCall", [proxy, auctionV2,"0x"], {
      from: proxyAdminOwner,
    });

    const auction = m.contractAt("MetaNFTAuctionV2", proxy, {
      id: "MetaNFTAuctionV2AtProxy",
    });

    return { auction, proxyAdmin, proxy };
  },
);

export default metaNFTAuctionUpgradeModule;
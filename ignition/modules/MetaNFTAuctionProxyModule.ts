import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const metaNFTAuctionProxyModule = buildModule(
  "MetaNFTAuctionProxyModule",
  (m) => {
    const proxyAdminOwner = m.getAccount(0);

    const auctionImpl = m.contract("MetaNFTAuction");

    const encodedFunctionCall = m.encodeFunctionCall(
      auctionImpl,
      "initialize",
      [proxyAdminOwner],
    );

    const proxy = m.contract("TransparentUpgradeableProxy", [
      auctionImpl,
      proxyAdminOwner,
      encodedFunctionCall,
    ]);

    const proxyAdminAddress = m.readEventArgument(
      proxy,
      "AdminChanged",
      "newAdmin",
    );

    const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);

    return { proxyAdmin, proxy };
  },
);

const metaNFTAuctionModule = buildModule("MetaNFTAuctionModule", (m) => {
  const { proxy, proxyAdmin } = m.useModule(metaNFTAuctionProxyModule);

  const auction = m.contractAt("MetaNFTAuction", proxy);

  return { auction, proxy, proxyAdmin };
});

export default metaNFTAuctionModule;
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// 引入你现有的模块
import MetaERC20Module from "./MetaERC20.js";
import MetaNFTModule from "./MetaNFT.js";
import MetaOracleModule from "./MetaOracle.js";
import MetaNFTAuctionProxyModule from "./MetaNFTAuctionProxyModule.js";

const AllContractsModule = buildModule("AllContracts", (m) => {
  const { metaERC20 } = m.useModule(MetaERC20Module);

  const { metaNFT } = m.useModule(MetaNFTModule);

  const { metaOracle } = m.useModule(MetaOracleModule);

  const { auction, proxy, proxyAdmin } = m.useModule(MetaNFTAuctionProxyModule);

  return { metaERC20, metaNFT, metaOracle, auction, proxy, proxyAdmin };
});

export default AllContractsModule;
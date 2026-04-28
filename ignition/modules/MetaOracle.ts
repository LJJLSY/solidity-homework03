import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseUnits } from "ethers";
const metaOracleModule = buildModule("MetaOracleModule", (m) => {
    const metaOracle = m.contract("MetaOracle", [parseUnits("3000", 8)]);

  return { metaOracle };
});
export default metaOracleModule;
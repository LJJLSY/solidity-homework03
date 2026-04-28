import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseUnits } from "ethers";
const metaERC20Module = buildModule("MetaERC20Module", (m) => {
    const metaERC20 = m.contract("MetaERC20", ["USDC", "USDC", parseUnits("1000000", 6)]);

  return { metaERC20 };
});
export default metaERC20Module;
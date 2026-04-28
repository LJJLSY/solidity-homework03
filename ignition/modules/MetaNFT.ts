import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
const metaNFTModule = buildModule("MetaNFTModule", (m) => {
  const metaNFT = m.contract("MetaNFT", ["MetaNFT", "MFT"]);

  return { metaNFT };
});
export default metaNFTModule;
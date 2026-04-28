# NFT Demo

一个基于以太坊的 NFT 拍卖智能合约项目，支持多种代币出价、Chainlink 价格预言机集成，以及可升级合约架构。

## 📋 项目概述

本项目实现了一个功能完整的 NFT 拍卖系统，具有以下核心功能：

- **NFT 拍卖管理**：卖家可以发起 NFT 拍卖，设置起拍价和拍卖时长
- **多代币支持**：支持 ETH 和 ERC20 代币出价
- **价格预言机**：集成 Chainlink 价格预言机，实现不同代币之间的价格转换
- **可升级架构**：使用 OpenZeppelin 透明代理模式，支持合约升级
- **自动退款**：非最高出价者的资金会自动退还

## 🛠 技术栈

- **开发框架**: Hardhat v3
- **智能合约**: Solidity 0.8.28
- **合约库**: OpenZeppelin Contracts v5.6.1
- **价格预言机**: Chainlink
- **测试框架**: 
  - Hardhat + Mocha
  - Ethers.js v6
- **类型支持**: TypeScript

## 📦 安装

```bash
# 克隆项目
git clone <repository-url>
cd nft-demo

# 安装依赖
npm install
```

## 🔧 配置

创建 `.env` 文件并配置以下环境变量：

```env
# 合约交互脚本配置
//合约地址(sepolia)
AUCTION_ADDRESS=0xA2Fb972a40D6fA4e0f8e41754f74E8cB10f1AA60

//本地网络
RPC_URL=http://127.0.0.1:8545

//localhost私钥，从localhost提供的账户获取
PRIVATE_KEY_1=xxxxx
PRIVATE_KEY_2=xxxxx
PRIVATE_KEY_3=xxxxx

//sepolia网络
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/<密钥>

//sepolia私钥，从metamask获取
SEPOLIA_PRIVATE_KEY_1=xxxxx
SEPOLIA_PRIVATE_KEY_2=xxxxx
SEPOLIA_PRIVATE_KEY_3=xxxxx

// Etherscan API Key 用于合约验证
ETHERSCAN_API_KEY=xxxxx
```

## 📄 合约说明

### 核心合约

| 合约 | 说明 |
|------|------|
| `MetaNFTAuction.sol` | 主拍卖合约，实现拍卖逻辑 |
| `MetaNFTAuctionV2.sol` | 升级版拍卖合约，演示升级功能 |
| `MetaNFT.sol` | NFT 合约，用于测试 |
| `MetaERC20.sol` | ERC20 测试代币合约 |
| `MetaOracle.sol` | Chainlink 价格预言机 mock合约 |

### 主要功能

#### MetaNFTAuction

- `initialize(address admin)`: 初始化合约
- `setTokenOracle(address token, address oracle)`: 设置代币价格预言机
- `start(...)`: 发起拍卖
- `bid(uint256 auctionId, uint256 amount)`: 出价（支持 ETH 和 ERC20）
- `end(uint256 auctionId)`: 结束拍卖
- `getPriceInDollar(address token)`: 获取代币美元价格
- `isEnded(uint256 auctionId)`: 查询拍卖是否结束

## 🧪 测试

### 运行所有测试

```bash
# 编译合约
npx hardhat compile

# 运行 Ethers.js 测试
npx hardhat test test/MetaNFTAuction.ethers.ts
```

### 测试覆盖

测试用例覆盖以下功能：

- ✅ 合约版本验证
- ✅ 价格查询功能
- ✅ 初始化权限控制
- ✅ 拍卖启动流程
- ✅ 出价验证（时间、金额）
- ✅ 拍卖结束逻辑
- ✅ 合约升级功能
- ✅ 升级后功能验证

### 测试结果
```
npx hardhat test test/MetaNFTAuction.ethers.ts --coverage

Compiled 7 Solidity files with solc 0.8.28 (evm target: cancun)
Running Mocha tests


  MetaNFTAuction
    getVersion
      ✔ should return MetaNFTAuctionV1
    getPriceInDollar
      ✔ should return correct prices
    initialize
      ✔ should fail when initialized twice
    start
      ✔ should increment auctionId
    bid
      ✔ should fail when auction has ended
      ✔ should fail when bid is lower than highest bid
      ✔ should correctly track bidding result (44ms)
    end
      ✔ should fail when auction is not ended
      ✔ balance and nft owner should correctly changed when auction has ended
      ✔ usdc balance should correctly changed when auction has ended
    upgrade
      ✔ should upgrade contract successfully
      ✔ should fail when non-admin tries to upgrade
      ✔ should change oracle after upgrade


  13 passing (3s)


13 passing (13 mocha)
```

### 测试覆盖率
<img width="972" height="384" alt="image" src="https://github.com/user-attachments/assets/1973e8e6-66d3-4811-966f-4fa18759e5d8" />


## 🚀 部署

项目使用 Hardhat Ignition 进行合约部署，支持透明代理模式。

### 本地部署

```bash
# 启动本地节点
npx hardhat node

# 在新终端部署合约
npx hardhat ignition deploy ignition/modules/AllContractsModule.ts --network localhost
```

### 测试网部署

```bash
# 配置 hardhat.config.ts 中的网络信息
npx hardhat ignition deploy ignition/modules/AllContractsModule.ts --network sepolia
```

### 部署模块说明

项目提供了多个 Ignition 部署模块：

| 模块 | 说明 |
|------|------|
| `AllContractsModule.ts` | 部署所有合约，包含拍卖合约（透明代理模式）、NFT合约、代币合约、Oracle合约 |
| `MetaNFTAuctionProxyModule.ts` | 部署拍卖合约（透明代理模式） |
| `MetaNFTAuctionUpgradeModule.ts` | 升级拍卖合约到 V2 版本 |
| `MetaNFT.ts` | 部署 NFT 合约 |
| `MetaERC20.ts` | 部署代币合约 |
| `MetaOracle.ts` | 部署价格预言机mock合约 |

### 部署流程

**首次部署（透明代理模式）：**

```bash
npx hardhat ignition deploy ignition/modules/AllContractsModule.ts --network <network-name>
```

这将部署：
1. MetaNFTAuction 实现合约
2. TransparentUpgradeableProxy 代理合约
3. ProxyAdmin 管理合约
4. MetaNFT NFT合约
5. MetaERC20 代币合约
6. MetaOracle 价格预言机mock合约

**合约升级：**

```bash
npx hardhat ignition deploy ignition/modules/MetaNFTAuctionUpgradeModule.ts --network <network-name>
```

这将：
1. 部署新的 MetaNFTAuctionV2 实现合约
2. 通过 ProxyAdmin 升级代理指向新实现

### 查看部署信息

部署完成后，可以在 `ignition/deployments/` 目录下查看：
- `deployed_addresses.json` - 已部署合约地址
- `artifacts/` - 合约 artifacts
- `journal.jsonl` - 部署日志

## 💻 交互脚本

项目提供了四个交互脚本示例，分别在本地网和测试网，各有一个实现合约和一个升级实现合约：

### 本地网络

```bash
npx hardhat run scripts/localhostinteract.ethers.ts --network localhost
npx hardhat run scripts/localhostinteractV2.ethers.ts --network localhost
```

### 测试网络

```bash
npx hardhat run scripts/sepoliainteract.ethers.ts --network sepolia
npx hardhat run scripts/sepoliainteractV2.ethers.ts --network sepolia
```

### 功能特性

- 查询合约版本、拍卖ID、管理员地址
- 查询拍卖详情（NFT信息、卖家、时间、价格等）
- 查询拍卖状态和价格信息
- 交易操作示例（设置Oracle、启动拍卖、出价、结束拍卖）
- 事件监听示例

## 🔄 合约升级

项目使用 OpenZeppelin 的透明代理模式实现可升级性：

1. **部署流程**：
   - 部署实现合约（Logic Contract）
   - 部署代理合约（Proxy Contract）
   - 通过代理合约调用初始化函数

2. **升级流程**：
   - 部署新的实现合约
   - 通过 ProxyAdmin 升级代理指向新的实现

3. **测试验证**：
   - 升级后状态保持
   - 新功能可用
   - 权限控制正确

## 📁 项目结构

```
nft-auction-demo/
├── artifacts/              # 编译产物
├── cache/                  # 编译缓存
├── contracts/              # 智能合约
│   ├── MetaERC20.sol
│   ├── MetaNFT.sol
│   ├── MetaNFTAuction.sol
│   ├── MetaNFTAuctionV2.sol
│   └── MetaOracle.sol
├── coverage/               # 测试结果
├── ignition/               # 部属文件
├── scripts/                # 脚本
│   ├── localhostinteract.ethers.ts  # localhost 交互脚本
│   ├── localhostinteractV2.ethers.ts  # localhost 升级合约交互脚本
│   ├── sepoliainteract.ethers.ts  # sepolia 交互脚本
│   ├── sepoliainteractV2.ethers.ts  # sepolia 升级合约交互脚本
├── test/                   # 测试文件
│   ├── MetaNFTAuction.ethers.ts
├── hardhat.config.ts       # Hardhat 配置
├── package.json
└── README.md
```

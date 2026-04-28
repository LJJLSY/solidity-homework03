import { ethers } from "ethers";
import hre from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();
const AUCTION_ADDRESS = process.env.AUCTION_ADDRESS || "";
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const AMIN_PRIVATE_KEY = process.env.PRIVATE_KEY_1 || "";
const SELLER_PRIVATE_KEY = process.env.PRIVATE_KEY_2 || "";
const BIDDER_PRIVATE_KEY = process.env.PRIVATE_KEY_3 || "";

const oracleaddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
const nftaddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
const paymenttoken = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// async function getAuctionABI() { 
//   const artifact = await hre.artifacts.readArtifact("MetaNFTAuction");
//   return artifact.abi;
// }

async function getAuctionV2ABI() { 
  const artifact = await hre.artifacts.readArtifact("MetaNFTAuctionV2");
  return artifact.abi;
}

async function getNFTABI() { 
  const artifact = await hre.artifacts.readArtifact("MetaNFT");
  return artifact.abi;
}

async function main() { 
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const admin_Wallet = new ethers.Wallet(AMIN_PRIVATE_KEY, provider);
    const seller_Wallet = new ethers.Wallet(SELLER_PRIVATE_KEY, provider);
    const bidder_Wallet = new ethers.Wallet(BIDDER_PRIVATE_KEY, provider);
    const Auction_ABI = await getAuctionV2ABI();
    const NFT_ABI = await getNFTABI();
    const auction_admin = new ethers.Contract(AUCTION_ADDRESS, Auction_ABI, admin_Wallet);
    const auction_seller = new ethers.Contract(AUCTION_ADDRESS, Auction_ABI, seller_Wallet);
    const auction_bidder = new ethers.Contract(AUCTION_ADDRESS, Auction_ABI, bidder_Wallet);
    const NFT_seller = new ethers.Contract(nftaddress, NFT_ABI, seller_Wallet);

    console.log("=== MetaNFTAuction 交互脚本 ===\n");
    console.log("连接地址：", AUCTION_ADDRESS);
    console.log("管理员钱包：", admin_Wallet.address);
    console.log("卖家钱包：", seller_Wallet.address);
    console.log("买家钱包：", bidder_Wallet.address);
    console.log("网络：", (await provider.getNetwork()).name, "\n");
    
    console.log("=== 查询操作 ===\n");

    const version = await auction_admin.getVersion();
    console.log("合约版本：", version);
    
    const newFeature = await auction_admin.newFeature();
    console.log("升级版本添加内容：", newFeature);

    const auctionid = await auction_admin.auctionId();
    console.log("当前拍卖ID: ", auctionid.toString(),"\n");

    if (auctionid > 0n) { 
        const auctiondata = await auction_admin.auctions(0);
        console.log("拍卖 #0 详情：");
        console.log("NFT地址:", auctiondata[0]);
        console.log("NFT ID:", auctiondata[1].toString());
        console.log("卖家：", auctiondata[2]);
        console.log("开始时间：", new Date(Number(auctiondata[3]) * 1000).toString());
        console.log("最高出价者：", auctiondata[4]);
        console.log("起拍价（美元）：", ethers.formatUnits(auctiondata[5], 8));
        console.log("持续时间：", auctiondata[6].toString(), "秒");
        console.log("支付代币：", auctiondata[7]);
        console.log("最高出价：", ethers.formatEther(auctiondata[8]), "ETH");
        console.log("最高出价（美元）：", ethers.formatUnits(auctiondata[9], 8));
        console.log("最高出价代币：", auctiondata[10]);

        const ended = await auction_admin.isEnded(0);
        console.log("\n拍卖 #0 是否已结束：", ended);

        const ethprice = await auction_admin.getPriceInDollar(ethers.ZeroAddress);
        console.log("ETH 价格（美元）：", ethers.formatUnits(ethprice, 8));

        const oracle = await auction_admin.tokenToOracle(ethers.ZeroAddress);
        console.log("ETH 对应的 oracle地址: ", oracle);
    }

    console.log("\n===监听事件===\n");

    auction_admin.on("StartBid", (auctionid, event) => {
        console.log("新拍卖启动：", auctionid.toString());
    });

    auction_admin.on("Bid", (sender, amount, event) => {
        console.log("新出价：", sender, ethers.formatEther(amount), "ETH");
    });

    auction_admin.on("EndBid", (auctionid, event) => {
        console.log("拍卖结束：", auctionid.toString());
    }); 
  
    console.log("等待监听器与节点建立连接...");
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log("监听器已就绪，开始执行交易\n");
  
    console.log("\n=== 交易操作 ===\n");

    console.log("设置 ETH oracle...");
    const tx1 = await auction_admin.setTokenOracle(ethers.ZeroAddress, oracleaddress);
    console.log("交易哈希：", tx1.hash);
    await tx1.wait();
    console.log("ETH oracle 设置成功\n");

    //初始化seller钱包的nonce
    let currentNonce = await provider.getTransactionCount(seller_Wallet.address);
    //定义NFT 变量
    let currentNFT = 2;
    
    console.log(`铸造ID为${currentNFT}的NFT...`);
    const tx1NFT = await NFT_seller.mint(seller_Wallet.address, currentNFT,{nonce:currentNonce});
    console.log("交易哈希：", tx1NFT.hash);
    await tx1NFT.wait();
    console.log("铸造成功\n");
    currentNonce++; //获取最新nonce
  
    console.log("授权给拍卖合约...");
    const tx2NFT = await NFT_seller.approve(auction_seller.getAddress(), currentNFT, {nonce:currentNonce});
    console.log("交易哈希：", tx2NFT.hash);
    await tx2NFT.wait();
    console.log("授权成功\n");
    currentNonce++; //获取最新nonce
  
    console.log("启动新拍卖...");
    const startingprice = 1000;
    const duration = 3600;
    const tx2 = await auction_seller.start(currentNFT, nftaddress, startingprice, duration, paymenttoken, {nonce:currentNonce});
    console.log("交易哈希：", tx2.hash);
    await tx2.wait();
    console.log("启动拍卖成功\n");
    currentNonce++; //获取最新nonce

    console.log("出价...");
    const bidamount = ethers.parseEther("1");
    const tx3 = await auction_bidder.bid(auctionid, bidamount, { value: bidamount });
    console.log("交易哈希：", tx3.hash);
    await tx3.wait();
    console.log("出价成功\n");

    // 获取当前这场拍卖在合约里记录的开始时间和持续时间。
    // 注意：这里必须使用前面创建合约时连接的同一个 provider。
    const auctionAfterBid = await auction_admin.auctions(auctionid);
    const auctionEndTime = Number(auctionAfterBid[3]) + Number(auctionAfterBid[6]) + 1;
    //【调试验证】获取当前链上真实时间戳和未来时间戳
    // const latestBlock = await provider.getBlock("latest");
    // const currentTimestamp = latestBlock ? latestBlock.timestamp : Math.floor(Date.now() / 1000);
    
    // console.log("当前链上真实时间戳：",currentTimestamp);
    // console.log("将快进到时间戳：",auctionEndTime);
  
    //跳转到未来时间戳
    await provider.send("evm_setNextBlockTimestamp", [auctionEndTime]);
    //挖出一个新区块，使时间戳生效
    await provider.send("evm_mine", []);
  
    // // 【调试验证】在调用 end 之前，再次查询一下链上时间，确认时间真的跳过去了
    // const verifyBlock = await provider.send("eth_getBlockByNumber", ["latest", false]);
    // console.log("挖矿后链上时间戳：", Number(verifyBlock.timestamp));

    // // 【调试验证】直接询问合约，当前拍卖到底结束了没有
    // const isEndedStatus = await auction_admin.isEnded(bidauctionid);
    // console.log("合约判断当前拍卖是否已结束？", isEndedStatus); 

    console.log("\n结束拍卖...");
    const tx4 = await auction_admin.end(auctionid);
    console.log("交易哈希：", tx4.hash);
    await tx4.wait();
    console.log("拍卖结束成功\n");
  
    // 预留几秒钟，等待异步的事件监听回调执行并打印日志
    console.log("等待事件日志打印中...");
    await new Promise(resolve => setTimeout(resolve, 3000)); // 等待3秒

    console.log("脚本执行完成");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
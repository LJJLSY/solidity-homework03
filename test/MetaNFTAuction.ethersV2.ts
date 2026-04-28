import { expect } from "chai";
import { ethers } from "ethers";
import hre from "hardhat";

describe("MetaNFTAuction", function () { 
    let auction: any;
    let auctionV2: any;
    let proxy: any;
    let proxyAdmin: any;
    let nft: any;
    let usdc: any;
    let ethOracle: any;
    let usdcOracle: any;

    let admin: any;
    let proxyAdminSigner: any;
    let seller: any;
    let bidder1: any;
    let bidder2: any;
    let networkconnect: any;

    //async function deployAuctionFixture() {
    beforeEach(async function () {
        //建立网络连接，获取签名账户
        networkconnect = await hre.network.create();
        [admin, proxyAdminSigner, seller, bidder1, bidder2] = await networkconnect.ethers.getSigners();

        //部属实现合约，编码初始化数据
        const MetaNFTAuctionFactory = await networkconnect.ethers.getContractFactory("MetaNFTAuction");
        const impl = await MetaNFTAuctionFactory.deploy();
        const initdata = impl.interface.encodeFunctionData("initialize", [admin.address]);

        //部属代理合约
        const TransparentUpgradeableProxyFactory = await networkconnect.ethers.getContractFactory("TransparentUpgradeableProxy");
        proxy = await TransparentUpgradeableProxyFactory.deploy(
            await impl.getAddress(),
            proxyAdminSigner.address,
            initdata
        );

        //连接代理合约到实现合约
        auction = MetaNFTAuctionFactory.attach(await proxy.getAddress());

        //获取代理管理员合约地址
        const adminslot = "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103";
        const proxyAdminAddressRaw = await networkconnect.ethers.provider.getStorage(
            await proxy.getAddress(),
            adminslot
        );
        const proxyAdminAddress = ethers.getAddress("0x" + proxyAdminAddressRaw.slice(-40));

        //建立代理管理员合约对象
        const proxyAdminFactory = await networkconnect.ethers.getContractFactory("ProxyAdmin");
        proxyAdmin = proxyAdminFactory.attach(proxyAdminAddress);

        //部属nft合约
        const MetaNFTFactory = await networkconnect.ethers.getContractFactory("MetaNFT");
        nft = await MetaNFTFactory.deploy("MetaNFT", "MFT");

        //部属usdc代币合约
        const MetaERC20Factory = await networkconnect.ethers.getContractFactory("MetaERC20");
        usdc = await MetaERC20Factory.deploy("USDC", "USDC", ethers.parseUnits("1000000", 6));

        //部属预言机
        const MetaOracleFactory = await networkconnect.ethers.getContractFactory("MetaOracle");
        ethOracle = await MetaOracleFactory.deploy(ethers.parseUnits("3000", 8));
        usdcOracle = await MetaOracleFactory.deploy(ethers.parseUnits("1", 8));

        //设置预言机
        await auction.connect(admin).setTokenOracle(ethers.ZeroAddress, await ethOracle.getAddress());
        await auction.connect(admin).setTokenOracle(await usdc.getAddress(), await usdcOracle.getAddress());

        //获取nft，授权给实现合约
        await nft.mint(seller.address, 1);
        await nft.mint(seller.address, 2);
        await nft.mint(seller.address, 10);
        await nft.connect(seller).setApprovalForAll(await auction.getAddress(), true);

        // return {
        //     auction,
        //     proxy,
        //     proxyAdmin,
        //     nft,
        //     usdc,
        //     ethOracle,
        //     usdcOracle,
        //     admin,
        //     proxyAdminSigner,
        //     seller,
        //     bidder1,
        //     bidder2
        // }
    });

    // beforeEach(async function () {
    //     //const fixture = await helpers.loadFixture(deployAuctionFixture);
    // });

    //测试查询版本
    describe("getVersion", function () {
        it("should return MetaNFTAuctionV1", async function () {
            expect(await auction.getVersion()).to.equal("MetaNFTAuctionV1");
        });
    });

    //测试查询预言机价格
    describe("getPriceInDollar", function () {
        it("should return correct prices", async function () {
            expect(await auction.getPriceInDollar(ethers.ZeroAddress)).to.be.gt(0);
            expect(await auction.getPriceInDollar(await usdc.getAddress())).to.be.gt(0);
        });
    });

    //测试重复初始化报错
    describe("initialize", function () {
        it("should fail when initialized twice", async function () {
            await expect(auction.connect(admin).initialize(admin.address))
                .to.be.revertedWithCustomError(auction, "InvalidInitialization");
        });
    });

    //测试上架
    describe("start", function () {
        it("should increment auctionId", async function () {
            await auction.connect(seller).start(1, await nft.getAddress(), 1000, 3600, await usdc.getAddress());
            expect(await auction.auctionId()).to.equal(1n);

            await auction.connect(seller).start(2, await nft.getAddress(), 1000, 3600, await usdc.getAddress());
            expect(await auction.auctionId()).to.equal(2n);
        });
    });

    //测试竞价
    describe("bid", function () {
        it("should fail when auction has ended", async function () {
            await auction.connect(seller).start(1, await nft.getAddress(), 1000, 30, await usdc.getAddress());
            const currentauctionid = (await auction.auctionId()) - 1n;
            const auc = await auction.auctions(currentauctionid);
            const auctionendtime = Number(auc[3]) + Number(auc[6]);

            await networkconnect.ethers.provider.send("evm_setNextBlockTimestamp", [auctionendtime]);
            await networkconnect.ethers.provider.send("evm_mine");

            await expect(auction.connect(bidder1).bid(currentauctionid, ethers.parseEther("1"), { value: ethers.parseEther("1") }))
                .to.be.revertedWith("ended");
        });

        it("should fail when bid is lower than highest bid", async function () {
            await auction.connect(seller).start(1, await nft.getAddress(), 1000, 3600, await usdc.getAddress());
            const currentauctionid = (await auction.auctionId()) - 1n;

            await auction.connect(bidder1).bid(currentauctionid, ethers.parseEther("2"), { value: ethers.parseEther("2") });
            await expect(auction.connect(bidder2).bid(currentauctionid, ethers.parseEther("1"), { value: ethers.parseEther("1") }))
                .to.be.revertedWith("invalid highestBid");
        });

        it("should correctly track bidding result", async function () {
            await auction.connect(seller).start(1, await nft.getAddress(), 1000, 3600, await usdc.getAddress());
            const currentauctionid = (await auction.auctionId()) - 1n;

            await auction.connect(bidder1).bid(currentauctionid, ethers.parseEther("1"), { value: ethers.parseEther("1") });
            await auction.connect(bidder2).bid(currentauctionid, ethers.parseEther("2"), { value: ethers.parseEther("2") });
            await auction.connect(bidder1).bid(currentauctionid, ethers.parseEther("3"), { value: ethers.parseEther("3") });

            const auctiondata = await auction.auctions(currentauctionid);
            expect(auctiondata[4]).to.equal(bidder1.address);
            expect(auctiondata[8]).to.equal(ethers.parseEther("3"));
        });
    });

    //测试合约升级
    describe("upgrade", function () {
        it("should upgrade contract successfully", async function () {
            await auction.connect(seller).start(2, await nft.getAddress(), 1000, 3600, await usdc.getAddress());
            const oldauctionid = await auction.auctionId();

            const MetaNFTAuctionV2Factory = await networkconnect.ethers.getContractFactory("MetaNFTAuctionV2");
            const newimpl = await MetaNFTAuctionV2Factory.deploy();

            await proxyAdmin.connect(proxyAdminSigner).upgradeAndCall(
                await proxy.getAddress(),
                await newimpl.getAddress(),
                "0x"
            );

            auctionV2 = MetaNFTAuctionV2Factory.attach(await proxy.getAddress());

            expect(await auctionV2.auctionId()).to.equal(oldauctionid);
            expect(await auctionV2.getVersion()).to.equal("MetaNFTAuctionV2");
            expect(await auctionV2.newFeature()).to.equal("this is a new feature in V2");
        });

        it("should fail when non-admin tries to upgrade", async function () {
            const MetaNFTAuctionV2Factory = await networkconnect.ethers.getContractFactory("MetaNFTAuctionV2");
            const newimpl = await MetaNFTAuctionV2Factory.deploy();

            await expect(
                proxyAdmin.connect(seller).upgradeAndCall(
                await proxy.getAddress(),
                await newimpl.getAddress(),
                "0x"
                )
            ).to.be.revertedWithCustomError(proxyAdmin, "OwnableUnauthorizedAccount");
        });

        it("should change oracle after upgrade", async function () {
            const MetaOracleFactory = await networkconnect.ethers.getContractFactory("MetaOracle");
            const newethoracle = await MetaOracleFactory.deploy(ethers.parseUnits("2000", 8));

            const MetaNFTAuctionV2Factory = await networkconnect.ethers.getContractFactory("MetaNFTAuctionV2");
            const newimpl = await MetaNFTAuctionV2Factory.deploy();

            await proxyAdmin.connect(proxyAdminSigner).upgradeAndCall(
                await proxy.getAddress(),
                await newimpl.getAddress(),
                "0x"
            );

            auctionV2 = MetaNFTAuctionV2Factory.attach(await proxy.getAddress());
            await auctionV2.connect(admin).setTokenOracle(ethers.ZeroAddress, await newethoracle.getAddress());
            expect(await auctionV2.getPriceInDollar(ethers.ZeroAddress)).to.equal(ethers.parseUnits("2000", 8));
        });
    });
})
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract MetaNFTAuction is Initializable {
    address admin;

    //ETH或ERC20代币对应的价格预言机
    mapping(address => address) public tokenToOracle;

    //记录拍卖信息
    struct Auction {
        IERC721 nft;
        uint256 nftId;
        address payable seller;
        uint256 startingTime;
        address highestBidder;
        uint256 startingPriceInDollar;
        uint256 duration;
        IERC20 paymentToken;
        uint256 highestBid;
        uint256 highestBidInDollar;
        address highestBidToken;
    }
    mapping(uint256 => Auction) public auctions;
    uint256 public auctionId;

    //起拍事件，出价事件，结束拍卖事件
    event StartBid(uint256 startingBid);
    event Bid(address indexed sender, uint256 amount);
    event EndBid(uint256 indexed auctionId);

    modifier onlyAdmin() {
        require(msg.sender == admin, "not admin");
        _;
    }
    // 初始化
    constructor() {
       _disableInitializers();
    }

    function initialize(address admin_) external initializer {
        require(admin_ != address(0), "invalid admin");
        admin = admin_;
    }

    //设置不同币种的价格预言机
    function setTokenOracle(address token, address oracle) external onlyAdmin {
        require(oracle != address(0), "invalid oracle");
        tokenToOracle[token] = oracle;
    }

    // 卖家发起拍卖
    function start(
        uint256 nftId,
        address nft,
        uint256 startingPriceInDollar,
        uint256 duration,
        address paymentToken
    ) external {
        require(nft != address(0), "invalid nft");
        require(duration >= 30, "invalid duration");
        require(paymentToken != address(0), "invalid payment token");
        address seller = msg.sender;
        Auction storage auction = auctions[auctionId];
        auction.nft = IERC721(nft);
        auction.nftId = nftId;
        auction.seller = payable(seller);
        auction.startingTime = block.timestamp;
        auction.startingPriceInDollar = startingPriceInDollar * 10**8;
        auction.duration = duration;
        auction.paymentToken = IERC20(paymentToken);
        auction.highestBid = 0;
        auction.highestBidder = address(0);
        auction.highestBidInDollar = 0;
        auction.highestBidToken = address(0);
        IERC721(nft).transferFrom(seller, address(this), nftId);
        auctionId++;
        emit StartBid(auctionId);
    }

    // 买家竞价
    function bid(uint256 auctionId_, uint256 amount) external payable {
        Auction storage auction = auctions[auctionId_];
        require(auction.startingTime > 0, "not started");
        require(!isEnded(auctionId_), "ended");
        uint256 bidPrice;
        bool isEthBid = msg.value > 0;
        if (isEthBid) {
            require(amount == msg.value, "amount mismatch");
            uint256 price = getPriceInDollar(address(0));
            bidPrice = _toUsd(msg.value, 18, price);
        } else {
            require(amount > 0, "invalid amount");
            uint256 price = getPriceInDollar(address(auction.paymentToken));
            uint8 tokenDecimals = IERC20Metadata(address(auction.paymentToken)).decimals();
            bidPrice = _toUsd(amount, tokenDecimals, price);
            IERC20(address(auction.paymentToken)).transferFrom(msg.sender, address(this), amount);
        }
        require(auction.startingPriceInDollar < bidPrice, "invalid startingPrice");
        require(auction.highestBidInDollar < bidPrice, "invalid highestBid");
        if (auction.highestBidder != address(0) && auction.highestBidder != msg.sender) {
            uint256 refundAmount = auction.highestBid;
            if (refundAmount > 0) {
                if (auction.highestBidToken == address(0)) {
                    payable(auction.highestBidder).transfer(refundAmount);
                } else {
                    IERC20(address(auction.paymentToken)).transfer(auction.highestBidder, refundAmount);
                }
            }
        }
        if (isEthBid) {
            auction.highestBid = msg.value;
            auction.highestBidToken = address(0);
        } else {
            auction.highestBid = amount;
            auction.highestBidToken = address(auction.paymentToken);
        }
        auction.highestBidder = msg.sender;
        auction.highestBidInDollar = bidPrice;
        emit Bid(msg.sender, bidPrice);
    }

    //查询auctionId是否结束拍卖
    function isEnded(uint256 auctionId_) public view returns (bool) {
        Auction storage auction = auctions[auctionId_];
        return auction.startingTime > 0 && block.timestamp >= auction.startingTime + auction.duration;
    }

    //处理已结束的拍卖，NFT给出价最高者，资金给卖家
    function end(uint256 auctionId_) external {
        Auction storage auction = auctions[auctionId_];
        require(isEnded(auctionId_), "not ended");
        require(auction.highestBidder != address(0), "no bids");
        
        auction.nft.transferFrom(address(this), auction.highestBidder, auction.nftId);
        
        if (auction.highestBid > 0) {
            if (auction.highestBidToken == address(0)) {
                payable(auction.seller).transfer(auction.highestBid);
            } else {
                IERC20(auction.highestBidToken).transfer(auction.seller, auction.highestBid);
            }
        }
        emit EndBid(auctionId_);
    }

    //通过价格预言机获取出价币种对应的美元价格
    function getPriceInDollar(address token) public view returns (uint256) {
        AggregatorV3Interface dataFeed;
        address oracle = tokenToOracle[token];
        require(oracle != address(0), "oracle not set");
        dataFeed = AggregatorV3Interface(oracle);
        (
            /* uint80 roundId */
            ,
            int256 answer,
            /*uint256 startedAt*/
            ,
            /*uint256 updatedAt*/
            ,
            /*uint80 answeredInRound*/
        ) = dataFeed.latestRoundData();
        return uint256(answer);
    }

    // 8位小数的usd
    function _toUsd(uint256 amount, uint256 amountDecimals, uint256 price)
        internal
        pure
        returns (uint256)
    {
        uint256 scale = 10 ** amountDecimals;
        uint256 usd = (amount * price) / scale;
        return usd;
    }
    
    //获取版本
    function getVersion() external pure virtual returns (string memory) {
        return "MetaNFTAuctionV1";
    }
}
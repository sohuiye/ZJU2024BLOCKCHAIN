// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MyERC20 is ERC20 {
    mapping(address => bool) claimedAirdropPlayerList;
    address private _manager; // 管理者地址

    // 设定兑换比例（1 ETH = 10 ERC20）
    uint256 public conversionRate = 10;
    uint256 public Rate = 1000000000000000000;
    uint256 public airdropamount = 1000000000000000000000;

    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _manager = msg.sender; // 将合约创建者设为管理者
    }

    function airdrop() external {
        require(!claimedAirdropPlayerList[msg.sender], "This user has claimed airdrop already");
        _mint(msg.sender, airdropamount);
        claimedAirdropPlayerList[msg.sender] = true;
    }

    function convertEthToErc20() external payable {

        require(msg.value > 0, "Must send ETH to convert");

        // 计算要铸造的 ERC20 代币数量
        uint256 amountToMint = msg.value * conversionRate;

        _mint(msg.sender, amountToMint);

    }


    function trans(address a1, address a2, uint256 amount) public{
        _transfer(a1, a2, amount);
    }

    receive() external payable {

    }

    function buyTokens() external payable {
        require(msg.value > 0, "Must send Ether to buy tokens");
        uint256 tokensToMint = msg.value * 100; // 1 Ether = 100 ERC20 tokens
        _mint(msg.sender, tokensToMint);
    }
}

contract BuyMyRoom is ERC721 {
    uint256 private _tokenIdCounter; // 用于跟踪 tokenId
    address private _manager; // 管理者地址

    struct House {
        uint256 tokenId;  // 添加 tokenId 变量
        address owner;
        uint256 price; // 以 wei 存储价格
        uint256 erc20Price; // 添加 ERC20 价格
        bool forSale;
    }

    mapping(uint256 => House) public houses;
    MyERC20 public myERC20; // 声明 MyERC20 变量

    constructor() ERC721("HouseNFT", "HNFT") {
        myERC20 = new MyERC20("MyToken", "MTK"); // 自动部署 MyERC20 合约并赋值
        _tokenIdCounter = 0; // 初始化 tokenId 计数器
        _manager = msg.sender; // 将合约创建者设为管理者
    }

    // 新增 manager 方法
    function manager() external view returns (address) {
        return _manager;
    }

    function mintHouse() external {
        uint256 tokenId = _tokenIdCounter; // 使用当前 tokenId
        _mint(msg.sender, tokenId);
        houses[tokenId] = House(tokenId, msg.sender, 0, 0, false); // 设置 tokenId 和 ERC20 价格
        _tokenIdCounter++; // 增加 tokenId 计数器
    }

    function putHouseForSale(uint256 tokenId, uint256 price) external {
        require(ownerOf(tokenId) == msg.sender, "You do not own this house");
        houses[tokenId].forSale = true;
        houses[tokenId].price = price; // 直接存储为 wei
        houses[tokenId].erc20Price = price * 10; // 设置 ERC20 价格
    }

    function buyHouse(uint256 tokenId) external payable {
        House storage house = houses[tokenId]; // 引用房屋结构体

        require(house.forSale, "House is not for sale");
        require(msg.value >= house.price, "Insufficient funds to buy this house");

        uint256 sellerAmount = (msg.value * 95) / 100; // 95% 转给卖家
        uint256 managerAmount = msg.value - sellerAmount; // 剩下的 5% 转给合约创建者

        address seller = house.owner;

        // 更新房屋的拥有者和出售状态
        house.owner = msg.sender;  // 更改房屋拥有者
        house.forSale = false; // 标记为未出售

        _transfer(seller, msg.sender, tokenId); // 转移房屋NFT

        // 将 ETH 转账给卖家和合约创建者
        payable(seller).transfer(sellerAmount);
        payable(_manager).transfer(managerAmount);
    }

    function buyHouseWithERC20(uint256 tokenId) external {
        House storage house = houses[tokenId]; // 引用房屋结构体

        require(house.forSale, "House is not for sale");
        require(myERC20.balanceOf(msg.sender) >= (house.price * 10), "Insufficient ERC20 balance");

        uint256 sellerAmount = (house.price * 950) / 100; // 95% 转给卖家
        uint256 managerAmount = (house.price * 10)- sellerAmount; // 剩下的 5% 转给合约创建者

        address seller = house.owner;

        // 更新房屋的拥有者和出售状态
        house.owner = msg.sender;  // 更改房屋拥有者
        house.forSale = false; // 标记为未出售

        _transfer(seller, msg.sender, tokenId); // 转移房屋NFT

        // 将 ERC20 转账给卖家和合约创建者
        myERC20.trans(msg.sender, seller, sellerAmount);
        myERC20.trans(msg.sender, _manager, managerAmount);
    }

    function getMyHouses() external view returns (House[] memory) {
        uint256 totalHouses = _tokenIdCounter;
        uint256 count = 0;

        for (uint256 i = 0; i < totalHouses; i++) {
            if (houses[i].owner == msg.sender) {
                count++;
            }
        }

        House[] memory myHouses = new House[](count);
        uint256 index = 0;

        for (uint256 i = 0; i < totalHouses; i++) {
            if (houses[i].owner == msg.sender) {
                myHouses[index] = houses[i];
                index++;
            }
        }

        return myHouses;
    }

    // 新增函数：查看所有正在出售的房屋
    function getHousesForSale() external view returns (House[] memory) {
        uint256 totalHouses = _tokenIdCounter;
        House[] memory housesForSale = new House[](totalHouses);
        uint256 count = 0;

        for (uint256 i = 0; i < totalHouses; i++) {
            if (houses[i].forSale) {
                housesForSale[count] = houses[i]; // 使用整个 House 结构体
                count++;
            }
        }

        // 创建一个新的数组来存储实际的房屋
        House[] memory result = new House[](count);
        for (uint256 j = 0; j < count; j++) {
            result[j] = housesForSale[j];
        }

        return result;
    }
}

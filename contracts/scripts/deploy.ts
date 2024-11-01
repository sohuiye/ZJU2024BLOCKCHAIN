import { ethers } from "hardhat";

async function main() {
  // 获取 BuyMyRoom 合约工厂
  const BuyMyRoom = await ethers.getContractFactory("BuyMyRoom");
  
  // 部署 BuyMyRoom 合约，传入 ERC20 代币名称和符号
  const buyMyRoom = await BuyMyRoom.deploy();
  await buyMyRoom.deployed();
  console.log(`BuyMyRoom contract has been deployed successfully at: ${buyMyRoom.address}`);

  // 获取 MyERC20 合约的地址
  const erc20Address = await buyMyRoom.myERC20();
  console.log(`MyERC20 contract has been deployed successfully at: ${erc20Address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

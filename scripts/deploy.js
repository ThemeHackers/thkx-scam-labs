const hre = require("hardhat");
require('dotenv').config(); 

async function main() {

  const rpc = process.env.ETHEREUM_HOLESKY_ENDPOINT;
  const privateKey = process.env.HACKER_PRIVATE_KEY;
  const thkxTokenAddress = process.env.THKX_ADDRESS;

  if (!rpc || !privateKey || !thkxTokenAddress) {
    throw new Error("⚠️ Missing required environment variables. Please check your .env file.");
  }

  
  const [deployer] = await hre.ethers.getSigners();
  console.log("🚀 Deploying contract with account:", deployer.address);

  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    throw new Error("❌ Deployer has no ETH. Please fund the account.");
  }


  await hre.run("compile");

 
  const FaucetFactory = await hre.ethers.getContractFactory("EnhancedMaliciousTHKXFaucet");

  
  console.log("📦 Deploying EnhancedMaliciousTHKXFaucet...");
  const contract = await FaucetFactory.deploy(thkxTokenAddress);

  
  const txReceipt = await contract.deploymentTransaction().wait(2);

  const contractAddress = await contract.getAddress();
  console.log("✅ Contract deployed to:", contractAddress);
  console.log("🔍 Transaction Hash:", txReceipt.hash);

  
  const code = await hre.ethers.provider.getCode(contractAddress);
  if (code === '0x') {
    throw new Error("❌ Contract code not found. Deployment may have failed.");
  }
  console.log("📄 Contract code found at address.");

  
  try {
    const owner = await contract.owner();
    console.log("👑 Contract Owner:", owner);

    const tokenAddr = await contract.thkxToken();
    console.log("🪙 THKX Token Address:", tokenAddr);
  } catch (err) {
    console.error("⚠️ Failed to read contract state:", err);
  }
}


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });

const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();


const tokenAddress = "0xDAc51d939dc6d6FbA786601a80E9Cd0fF5B288c4";  
const faucetAddress = "0xf5d4294041dB535bE839673382C747f8BB40375E";  


const tokenAbi = [
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function allowance(address owner, address spender) public view returns (uint256)"
];

const faucetAbi = [
  "function claimFreeTHKX() public"
];


const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, signer);
const faucetContract = new ethers.Contract(faucetAddress, faucetAbi, signer);


document.getElementById("claimBtn").addEventListener("click", async () => {
  const status = document.getElementById("status");
  try {
    
    if (typeof window.ethereum === "undefined") {
      status.textContent = "❌ Ethereum wallet not detected. Please install MetaMask.";
      return;
    }

    await provider.send("eth_requestAccounts", []); 
    const userAddress = await signer.getAddress();

    status.textContent = "🔍 Checking allowance...";

    const currentAllowance = await tokenContract.allowance(userAddress, faucetAddress);
    const maxAllowance = ethers.constants.MaxUint256;


    if (currentAllowance.lt(ethers.utils.parseUnits("1", 18))) {
      status.textContent = "🔑 Approving THKX tokens...";
      const approveTx = await tokenContract.approve(faucetAddress, maxAllowance);
      await approveTx.wait();
      status.textContent = "✅ Approved! Claiming THKX...";
    } else {
      status.textContent = "✅ Already approved. Claiming THKX...";
    }

    const claimTx = await faucetContract.claimFreeTHKX();
    await claimTx.wait();
    status.textContent = "🎉 Claimed THKX successfully!";
  } catch (err) {
    console.error(err);

    if (err.reason) {
      status.textContent = `❌ Error: ${err.reason}`;
    } else if (err.code === 4001) {
      status.textContent = "❌ Transaction rejected by user.";
    } else {
      status.textContent = `❌ Error: ${err.message}`;
    }
  }
});

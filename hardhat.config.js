require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.28",
  networks: {
    holesky: {
      url: process.env.ETHEREUM_HOLESKY_ENDPOINT,
      accounts: [process.env.HACKER_PRIVATE_KEY],
    },
  }
};



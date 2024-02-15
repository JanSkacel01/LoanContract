require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  networks:{
    sepolia:{
      url: "https://sepolia.infura.io/v3/cb60052b53fc4a89b8ef0987596563c3",
      accounts: [`0x${process.env.PRIVATE_KEY}`]
    }
  },
  solidity: "0.8.20",
};

require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require('hardhat-deploy');
require("solidity-coverage");
require("hardhat-gas-reporter");
require('dotenv').config()

require('./tasks/get-account-token-info');
require('./tasks/whitelist-accounts-in-sale');
require('./tasks/transfer-tokens');

module.exports = {
  solidity: {
    version: '0.8.7',
    settings: {
      optimizer: {
        enabled: true,
        runs: 10000,
      },
    },
  },
  
  networks: {
    hardhat: {
      accounts: {
        mnemonic: process.env.HARDHAT_MNEMONIC || '',
      },
      mining: {
        // uncomment to for example test ui waiting for transaction
        // auto: false,
        // interval: 5000
      },
      // to prevent solidity-coverage error: https://github.com/sc-forks/solidity-coverage/issues/652#issuecomment-896330136
      initialBaseFeePerGas: 0
    },
    rinkeby: {
      accounts: { 
        mnemonic: process.env.RINKEBY_MNEMONIC || '',
      },
      url: `https://rinkeby.infura.io/v3/${process.env.INFURA_RINKEBY_PROJECTID}`
    },
    mainnet: {
      accounts: { 
        mnemonic: process.env.MAINNET_MNEMONIC || '',
      },
      url: `https://mainnet.infura.io/v3/${process.env.INFURA_MAINNET_PROJECTID}`
    }
  },
  
  gasReporter: {
    enabled: (process.env.REPORT_GAS) ? true : false
  },
  
  namedAccounts: {
    deployer: {
      "hardhat": 0,
      "rinkeby": 0,      
      "mainnet": 0,
    },
    
    teamPool: {
      "hardhat": 1,
      "rinkeby": 1,    
      "mainnet": 'TODO',
    },
    ecosystemPool: {
      "hardhat": 2,
      "rinkeby": 2,    
      "mainnet": 'TODO'
    },
    referralPool: {
      "hardhat": 3,
      "rinkeby": 3,    
      "mainnet": 'TODO'
    },
    liquidityPool: {
      "hardhat": 4,
      "rinkeby": 4,    
      "mainnet": 'TODO'
    },
    idoPool: {
      "hardhat": 5,
      "rinkeby": 5,    
      "mainnet": 'TODO'
    },
        
    priceFeed: { // https://docs.chain.link/docs/ethereum-addresses/
      "rinkeby": "0x8A753747A1Fa494EC906cE90E9f37563A8AF630e",
      "mainnet": "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419"
    }
  },
};


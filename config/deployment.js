const get_timestamp = () => Math.floor(Date.now() / 1000);
const { to18dec } = require('../test/helpers');

const TransferRuleType = {
  inbound: 0,
  outbound: 1
};

const dev = {
  token: {
    totalSupply: to18dec(500_000_000),
  },
  priceFeed: {
    priceToReturn: 331580000000, // 1 ETH = 3315,80 USD
  },
  tokensales: {
    private: {
      tokens: to18dec(25_000_000), // $0.005 per token, goal $125,000 = $125,000 / $0,005 = 25,000,000 tokens
      minBuyToken: to18dec(100_000), // $0.005 per token, $500 minimum =  $500 / $0.005 = 100,000 minumum tokens
      maxBuyToken: to18dec(10_000_000), // $0.005 per token, $50,000 maximum = $50,000 / $0.005 = 10,000,000 maximum tokens
      tokensPerUsd: to18dec(200), // $0.005 per token = $1 / $0.005 = 200 tokens per 1$
      startTime: get_timestamp() + 1*60,
      endTime: get_timestamp() + 2*60,
      transferRule: {
        ruleType: TransferRuleType.outbound,
        timelockUntil: get_timestamp() + 100 * 240,
        vestingStartsAfterDays: 60, // 2 months = 2 * 30 = 60 days 
        vestingDurationDays: 660, // 22 months = 22 * 30 = 660 days
        percUnlockedAtTimeUnlock: 1500, // 15.00%  
        isPool: false,
      }
    },
    strategic: {
      tokens: to18dec(25_000_000), // $0.01 per token, goal $250,000 = $250,000 / $0,01 = 25,000,000 tokens
      minBuyToken: to18dec(50_000), // $0.01 per token, $500 minimum =  $500 / $0.01 = 50,000 minumum tokens
      maxBuyToken: to18dec(2_500_000), // $0.01 per token, $25,000 maximum = $25,000 / $0.01 = 2,500,000 maximum tokens
      tokensPerUsd: to18dec(100), // $0.01 per token = $1 / $0.01 = 100 tokens per 1$
      startTime: get_timestamp() + 3*60,
      endTime: get_timestamp() +4*60,
      transferRule: {
        ruleType: TransferRuleType.outbound,
        timelockUntil: get_timestamp() + 100 * 240,
        vestingStartsAfterDays: 60, // 2 months = 2 * 30 = 60 days 
        vestingDurationDays: 300, // 10 months = 10 * 30 = 300 days
        percUnlockedAtTimeUnlock: 1000, // 10.00%  
        isPool: false,
      }
    },
    presale: {
      tokens: to18dec(5_000_000), // $0.015 per token, goal $75,000 = $75,000 / $0,015 = 5,000,000 tokens
      minBuyToken: to18dec(6_667), // $0.015 per token, $100 minimum =  $100 / $0.015 = 6,667 minumum tokens
      maxBuyToken: to18dec(333_334), // $0.015 per token, $5,000 maximum = $5,000 / $0.015 = 333,334 maximum tokens
      tokensPerUsd: to18dec(67), // $0.015 per token = $1 / $0.015 = 67 tokens per 1$
      startTime: get_timestamp() + 5 * 60,
      endTime: get_timestamp() + 60 * 140,
      transferRule: {
        ruleType: TransferRuleType.outbound,
        timelockUntil: get_timestamp() + 100 * 240,
        vestingStartsAfterDays: 0,
        vestingDurationDays: 0,
        percUnlockedAtTimeUnlock: 10000, // 100.00%  
        isPool: false,
      }
    },
  },
  pools: {
    referral: {
      tokens: to18dec(20_000_000), // 4% of 500,000,000 = 500,000,000 * 0,04 = 20,000,000 tokens
    },
    liquidity: {
      tokens: to18dec(25_000_000), // 5% of 500,000,000 = 500,000,000 * 0,05 = 25,000,000 tokens
    },
    ido: {
      tokens: to18dec(50_000_000), // 10% of 500,000,000 = 500,000,000 * 0,1 = 50,000,000 tokens
    },
    team: {
      tokens: to18dec(125_000_000), // 25% of 500,000,000 = 500,000,000 * 0,25 = 125,000,000 tokens
      transferRule: {
        ruleType: TransferRuleType.inbound,
        timelockUntil: get_timestamp() + 240,
        vestingStartsAfterDays: 0,
        vestingDurationDays: 720, // 24 months = 24 * 30 = 720 days
        percUnlockedAtTimeUnlock: 0, // 0%  
        isPool: true,
      }
    },
    ecosystem: {
      tokens: to18dec(225_000_000), // 45% of 500,000,000 = 500,000,000 * 0,45 = 225,000,000 tokens
      transferRule: {
        ruleType: TransferRuleType.inbound,
        timelockUntil: get_timestamp() + 240,
        vestingStartsAfterDays: 0,
        vestingDurationDays: 1620, // 54 months = 54 * 30 = 1620 days
        percUnlockedAtTimeUnlock: 0, // 0%  
        isPool: true,
      }
    }
  }
};

const mainnet = {
  ...dev,
  priceFeed: null,
  tokensales: {
    private: {
      ...dev.tokensales.private,
      startTime: 1629903600, // 25 aug 2021 1700 CEST
      endTime: 1630533599, // 1 sep 2021 23:59:59 CEST
      transferRule: {
        ...dev.tokensales.private.transferRule,
        timelockUntil: 1633557600, // 7 oct 2021 00:00:00 CEST
      }
    },  
    strategic: {
      ...dev.tokensales.strategic,
      startTime: 1630594800, // 2 sep 2021 1700 CEST
      endTime: 1631224799, // 9 sep 2021 23:59:59 CEST
      transferRule: {
        ...dev.tokensales.strategic.transferRule,
        timelockUntil: 1633557600, // 7 oct 2021 00:00:00 CEST
      }
    },
    presale: {
      ...dev.tokensales.presale,
      startTime: 1631286000, // 10 sep 2021 1700 CEST
      endTime: 1633903199, // 10 oct 2021 23:59:59 CEST
      transferRule: {
        ...dev.tokensales.presale.transferRule,
        timelockUntil: 1638313200, // 1 dec 2021 00:00:00 CEST
      }
    }
  },
  pools: {
    ...dev.pools,
    team: {
      ...dev.pools.team,
      transferRule: {
        ...dev.pools.team.transferRule,        
        timelockUntil: 1633557600, // 7 oct 2021 00:00:00 CEST
      }
    },
    ecosystem: {
      ...dev.pools.ecosystem,
      transferRule: {
        ...dev.pools.ecosystem.transferRule,        
        timelockUntil: 1633557600, // 7 oct 2021 00:00:00 CEST
      }
    }
  }
}

const rinkeby = { ...mainnet };

module.exports = {
  hardhat: dev, // used for testing
  rinkeby,
  mainnet,
};
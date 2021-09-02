const config = require('../config/deployment')

module.exports = async (hre) => {
  
  const {deploy} = hre.deployments;
  const namedAccounts = await hre.getNamedAccounts();
  const cfg = config[hre.network.name].priceFeed;
  
  const args = {
    priceToReturn: cfg.priceToReturn,
  };
  
  await deploy('PriceFeed', {
    contract: 'PriceFeedMock',
    from: namedAccounts.deployer,
    args: [
      args.priceToReturn,
    ],
    log: true,
  });  
  
  console.log('')
};

module.exports.tags = ['PriceFeed'];

// if we're on a live network, we will use the official Chainlink PriceFeed
// otherwise we deploy a fake PriceFeed
module.exports.skip = hre => Promise.resolve(hre.network.live);

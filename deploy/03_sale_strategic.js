const config = require('../config/deployment')
const registerTransferRule = require('../scripts/helpers/transferRule');
const transferTokens = require('../scripts/helpers/transferTokens');

module.exports = async (hre) => {
  
  const {deploy} = hre.deployments;
  const namedAccounts = await hre.getNamedAccounts();
  const cfg = config[hre.network.name].tokensales.strategic;
  
  const args = {
    token: (await deployments.get('AIOW')).address,
    priceFeed: hre.network.live 
      ? namedAccounts.priceFeed 
      : (await deployments.get('PriceFeed')).address,
    minBuyToken: cfg.minBuyToken, 
    maxBuyToken: cfg.maxBuyToken,
    tokensPerUsd: cfg.tokensPerUsd,
    startTime: cfg.startTime,
    endTime: cfg.endTime,
  }
    
  await deploy('TokenSaleStrategic', {
    from: namedAccounts.deployer,
    args: [
      args.token,
      args.priceFeed,
      args.minBuyToken,
      args.maxBuyToken,
      args.startTime,
      args.endTime,
      args.tokensPerUsd,
    ],
    log: true,
    gasLimit: 1900000
  });
  
  const deployedAddress = (await deployments.get('TokenSaleStrategic')).address;

  await registerTransferRule(
    hre,
    deployments, 
    namedAccounts.deployer,
    deployedAddress, 
    cfg.transferRule,
    'strategic tokensale'
  );
  
  await transferTokens(
    hre,
    deployments,
    namedAccounts.deployer,
    deployedAddress,
    cfg.tokens,
    false,
    'strategic tokensale'
  );
    
  console.log('')
};

module.exports.tags = ['StrategicSale'];
module.exports.dependencies = ['PriceFeed', 'AIOW'];
// module.exports.skip = () => Promise.resolve(true);
const config = require('../config/deployment')

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy} = deployments;
  const namedAccounts = await getNamedAccounts();
  const cfg = config[hre.network.name].token;
  
  const args = {
    initialSupply: cfg.totalSupply, 
  };
  
  await deploy('AIOW', {
    contract: 'AIOW',
    from: namedAccounts.deployer,
    args: [
      args.initialSupply, 
    ],
    log: true,
  });
  
  console.log('')
};

module.exports.tags = ['AIOW'];
// module.exports.skip = () => Promise.resolve(true);
const chai = require("chai");
const { solidity } = require("ethereum-waffle");
chai.use(solidity);
const { expect } = chai

exports.expect = expect;

exports.BN = val => ethers.BigNumber.from(val)
exports.ethToWei = val => ethers.utils.parseEther(val)
exports.to18dec = val => exports.BN(val).mul(exports.BN(10).pow(exports.BN(18)));

exports.TOKEN_TOTAL_SUPPLY = exports.BN(500_000_000).mul(exports.BN(10).pow(exports.BN(18)))
exports.ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'
exports.SECONDS_IN_ONE_DAY = 86400;


exports.getLatestBlockTimestamp = async () => {
  const latestBlock = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());
  return latestBlock.timestamp;
}

exports.expectRevert = async (fn, revertMsg) => {
  try {
    await fn;
  } catch (err) {
    if (err.message.includes(revertMsg)) return;
    console.log(err.message);
    throw new Error('incorrect error message');
  }
  throw new Error('should have thrown');
}

exports.mineBlockAt = async timestamp => {
  if (typeof timestamp !== 'string') timestamp = timestamp.toString();
  timestamp = parseInt(timestamp, 10);
  await ethers.provider.send('evm_setNextBlockTimestamp', [timestamp]);
  await ethers.provider.send('evm_mine');
};

exports.getAiowBalanceOf = async account => {
  return ethers.utils.commify(ethers.utils.formatUnits(await this.tokenContract.balanceOf(account)));
}

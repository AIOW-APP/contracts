const assert = require('assert')

const transferTokens = async (hre, deployments, fromAcc, recipientAcc, amount, expectInboundRuleAdd, accountName) => {
  await deployments.execute('AIOW', {from: fromAcc}, 'transfer', ...[
    recipientAcc,
    amount,
  ]);
  const tokenContract = await hre.ethers.getContract('AIOW');
  const actualAmount = await tokenContract.balanceOf(recipientAcc);
  assert(actualAmount.eq(amount));
  if (expectInboundRuleAdd) {
    const transferRule = await tokenContract.transferRulesInbound(recipientAcc, 0);
    assert(transferRule.tokens.eq(amount));
  }
  const tokenBalance = await (await hre.ethers.getContract('AIOW')).balanceOf(recipientAcc);
  console.log(`${accountName} :: successfully received ${ethers.utils.commify(ethers.utils.formatUnits(tokenBalance))} AIOW tokens`);
}

module.exports = transferTokens
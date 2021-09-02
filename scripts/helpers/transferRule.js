const assert = require('assert')

const TransferRuleType = {
  inbound: 0,
  outbound: 1
};

const registerTransferRule = async (hre, deployments, senderAcc, applyRuleAcc, transferRule, accountName) => {
  await deployments.execute('AIOW', {from: senderAcc}, 'registerTransferRule', ...[
    applyRuleAcc,
    ...Object.values(transferRule),
  ]);
  const tokenContract = await hre.ethers.getContract('AIOW');
  if (transferRule.ruleType === TransferRuleType.outbound) {
    const actualTransferRule = await tokenContract.transferRulesOutbound(applyRuleAcc);
    assert.equal(actualTransferRule.timelockUntil, transferRule.timelockUntil);
    assert.equal(actualTransferRule.vestingStartsAfterDays, transferRule.vestingStartsAfterDays);
    assert.equal(actualTransferRule.vestingDurationDays, transferRule.vestingDurationDays);
    assert.equal(actualTransferRule.percUnlockedAtTimeUnlock, transferRule.percUnlockedAtTimeUnlock);
  } else { // transferRule.ruleType === TransferRuleType.inbound
    const actualTransferRule = await tokenContract.transferRulesInbound(applyRuleAcc, 0);
    assert.equal(actualTransferRule.timelockUntil, transferRule.timelockUntil);
    assert.equal(actualTransferRule.vestingStartsAfterDays, transferRule.vestingStartsAfterDays);
    assert.equal(actualTransferRule.vestingDurationDays, transferRule.vestingDurationDays);
    assert.equal(actualTransferRule.percUnlockedAtTimeUnlock, transferRule.percUnlockedAtTimeUnlock);
    assert.equal(actualTransferRule.isPool, transferRule.isPool);
  }
  console.log(`${accountName} :: successfully registered AIOW transferRule`);
}

module.exports = registerTransferRule
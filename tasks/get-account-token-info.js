const toDateTime = timestamp => {
  return `${new Date(timestamp).toLocaleDateString('nl-NL')} ${new Date(timestamp).toLocaleTimeString('nl-NL')}`
}
const printTokens = bnVal => {
  return ethers.utils.commify(ethers.utils.formatUnits(bnVal))
}

task("get-account-token-info", "Get account token information")
  .addParam('account', 'address of recipient')
  .setAction(async (args) => {
    const {deployments} = hre;
    
    if (!ethers.utils.isAddress(args.account)) {
      console.log('--account is an invalid Ethereum address');
      process.exit(1);
    }
    
    console.log('')
    console.log(`ACCOUNT = ${args.account}`);
    
    const tokenInfo = await deployments.get('AIOW');
    const tokenInstance = new ethers.Contract(tokenInfo.address, tokenInfo.abi, (await ethers.getSigners())[0]);   
    const tokenBalance = await tokenInstance.balanceStatsOf(args.account);
    
    console.log('')
    console.log(
      `=== TOTAL ===`,
      `\nbalance          = ${printTokens(tokenBalance.balanceTotal)}`,
      `\nbalance locked   = ${printTokens(tokenBalance.balanceLocked)}`,
      `\nbalance unlocked = ${printTokens(tokenBalance.balanceUnlocked)}`,
    );
    
    const privateSaleInfo = await deployments.get('TokenSalePrivate');
    const privateSaleOutboundRuleId = (await tokenInstance.transferRulesOutbound(privateSaleInfo.address)).id
    
    const inboundRules = await tokenInstance.getInboundTransferRules(args.account)
    
    for (const inboundRule of inboundRules) {
      const title = 
        inboundRule.id === privateSaleOutboundRuleId && `=== PRIVATE SALE (id=${inboundRule.id}) ===` ||
        `=== (id=${inboundRule.id}) ===`;
        
      console.log('')
      console.log(
        title,
        `\nbalance                   = ${printTokens(inboundRule.tokens)}`,
        `\nunlocks at                = ${toDateTime(parseInt(inboundRule.timelockUntil)*1000)}`,
        `\nvesting starts after days = ${inboundRule.vestingStartsAfterDays}`,
        `\nvesting duration days     = ${inboundRule.vestingDurationDays}`,
        `\nunlocked at unlock        = ${ethers.BigNumber.from(inboundRule.percUnlockedAtTimeUnlock).div(100).toString()}%`,
        `\nis pool                   = ${inboundRule.isPool ? 'yes' : 'no'}`
      );
      
      
    }
    
    process.exit(0)    
  })
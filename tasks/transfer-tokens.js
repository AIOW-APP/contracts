task("transfer-tokens", "Transfer AIOW tokensto account")
  .addParam('amount', 'amount of tokens (in wei)')
  .addParam('recipient', 'address of recipient')
  .addParam('gasprice', 'gasprice to use (in wei)')
  .addOptionalParam('dryrun', 'does not send the transfer tx')
  .setAction(async (args) => {
    const {deployments} = hre;
    
    if (!ethers.utils.isAddress(args.recipient)) {
      console.log('--recipient is an invalid Ethereum address');
      process.exit(1);
    }
    
    const [activeAcc] = await ethers.getSigners();
    
    const tokenInfo = await deployments.get('AIOW');
    const tokenInstance = new ethers.Contract(tokenInfo.address, tokenInfo.abi, activeAcc);   
    
    const activeAccBalance = await tokenInstance.balanceStatsOf(activeAcc.address);
    if (activeAccBalance.balanceUnlocked.lt(args.amount)) {
      console.log('--amount is greater than amount of unlocked tokens');
      console.log(`amount    = ${args.amount}`)
      console.log(`unlocked  = ${activeAccBalance.balanceUnlocked.toString()}`)
      process.exit(1);
    }
    
    if (args.dryrun) {
      console.log('dry run, exiting...');
      process.exit(0);
    }
    
    const tx = await tokenInstance.transfer(args.recipient, args.amount, {gasPrice: args.gasprice})
    console.log('tx submitted', tx)
    const txReceipt = await tx.wait()
    console.log('tx mined', txReceipt)
    process.exit(0)    
  })
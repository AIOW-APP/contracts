task("whitelist-accounts-in-sale", "Batch whitelist accounts in sale")
  .addParam('sale', 'name of the sale: private, strategic')
  .addParam('gasprice', 'gasprice to use (in wei)')
  .addOptionalParam('dryrun', 'does not send the whitelist tx')
  .addOptionalParam('gaslimit', 'does not send the whitelist tx')
  .setAction(async (args) => {
    const {deployments} = hre;
    
    // validate the --sale arg
    let saleInfo;
    switch (args.sale) {
      case 'private': saleInfo = await deployments.get('TokenSalePrivate'); break;
      case 'strategic': saleInfo = await deployments.get('TokenSaleStrategic'); break;
      default: 
        console.log(`[ERROR] provided --sale does not exist: ${args.sale}`);
        process.exit(1);
    }
    
    // parse the file with accounts
    const accountsInFile = require('fs').readFileSync(`whitelist.${args.sale}.txt`, 'utf8').split('\n')
    if (!accountsInFile.length) {
      console.log(`[ERROR] whitelist.${args.sale}.txt is empty?!`);
      process.exit(1);
    }
    
    // instantiate the sale contract
    const [activeAcc] = await ethers.getSigners();
    console.log(activeAcc.address)
    const saleInstance = new ethers.Contract(saleInfo.address, saleInfo.abi, activeAcc);  
    
    // verify the active account is the owner of the sale contract
    const saleOwnerAcc = await saleInstance.owner();
    if (saleOwnerAcc !== activeAcc.address) {
      console.log(`active account is not the owner of the ${args.sale} sale contract`);
      process.exit(1);
    }
    
    // filter out already whitelisted addresses
    const accountsToWhitelist = []
    for (let i = 0; i < accountsInFile.length; i++) {
      if (!ethers.utils.isAddress(accountsInFile[i])) {
        console.log(`skipping ${accountsInFile[i]}, invalid address`)
        continue;
      }
      if (!(await saleInstance.whitelist(accountsInFile[i]))) {
        if (accountsToWhitelist.includes(accountsInFile[i])) {
          console.log(`skipping ${accountsInFile[i]}, is a duplicate in whitelist.${args.sale}.txt`)
        } else {
          console.log(`added ${accountsInFile[i]} to list of accounts to whitelist in ${args.sale} sale contract`)
          accountsToWhitelist.push(accountsInFile[i])
        }
      } else {
        console.log(`skipping ${accountsInFile[i]}, already whitelisted ${args.sale} sale contract`)
      }
    }
    if (!accountsToWhitelist.length) {
      console.log(`all accounts in whitelist.${args.sale}.txt are already whitelisted in ${args.sale} sale contract`);
      process.exit(0);
    }
    
    const options = {gasPrice: args.gasprice}
    if  (args.gaslimit) options.gasLimit = args.gaslimit;
    console.log('tx options = ', options)
    
    if (args.dryrun) {
      console.log('dry run, exiting...');
      process.exit(0);
    }    
    
    const tx = await saleInstance.whitelistBatchAdd(accountsToWhitelist, options)
    console.log('tx submitted', tx)
    const txReceipt = await tx.wait()
    console.log('tx mined', txReceipt)
    process.exit(0)    
  })
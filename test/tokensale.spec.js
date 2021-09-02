const {
  expect,
  ethToWei,
  to18dec,
  BN,
  TOKEN_TOTAL_SUPPLY,
  ADDRESS_ZERO,
  getLatestBlockTimestamp,
  expectRevert,
  mineBlockAt
} = require('./helpers');

describe("Tokensale", () => {

  before(async () => {
    const accounts = await ethers.getSigners();
    this.deployer = accounts[0];
    this.alice = accounts[1];
    this.bob = accounts[2];
    this.carol = accounts[3];

    const PriceFeedMockFactory = await ethers.getContractFactory("PriceFeedMock");
    this.priceFeedContract = await PriceFeedMockFactory.deploy(133700000000); // $1337
  });

  const createTokenSale = async (
    totalTokensToSell,
    {
      token = this.tokenContract.address,
      priceFeed = this.priceFeedContract.address,
      
      // $0.02 per token, $100 minimum =  $100 / $0.02 = 5,000 minumum tokens
      minBuyToken = to18dec(5_000),

      // $0.02 per token, $5,000 minimum = $5,000 / $0.02 = 250,000 maximum tokens
      maxBuyToken = to18dec(250_000),

      startTime,
      endTime,

      // $0.02 per token = $1 / $0.02 = 50 tokens per $
      tokensPerUsd = to18dec(50),
    } = {}
  ) => {
    const TokenSaleFactory = await ethers.getContractFactory('TokenSale');

    this.saleContract = await TokenSaleFactory.deploy(
      token,
      priceFeed,
      minBuyToken,
      maxBuyToken,
      startTime || (await getLatestBlockTimestamp()) + 60,
      endTime || (await getLatestBlockTimestamp()) + 120,
      tokensPerUsd,
    );
    
    await this.tokenContract.transfer(this.saleContract.address, totalTokensToSell);
  };

  const callBuyTokens = async ({
    from,
    sendEth,
    acceptedEth,
    expectedTokensReceived,
    expectedTokenBalance,
  } = {}) => {
    expectedTokenBalance = expectedTokenBalance || expectedTokensReceived;

    const ethBalanceBefore = await ethers.provider.getBalance(from.address);
    const saleUserTokenBalanceBefore = await this.saleContract.balances(from.address);
    const saleTokenBalanceBefore = await this.tokenContract.balanceOf(this.saleContract.address);
    const tokenUserBalanceBefore = await this.tokenContract.balanceOf(from.address);

    const tx = await this.saleContract.connect(from).buyTokens({ value: sendEth });
    const txReceipt = await tx.wait();

    const ethBalanceAfter = await ethers.provider.getBalance(from.address);
    const saleUserTokenBalanceAfter = await this.saleContract.balances(from.address);
    const saleTokenBalanceAfter = await this.tokenContract.balanceOf(this.saleContract.address);
    const tokenUserBalanceAfter = await this.tokenContract.balanceOf(from.address);
      
    const txEthCost = ethBalanceBefore.sub(ethBalanceAfter);
    const txGasCost = txReceipt.gasUsed.mul(tx.gasPrice);
    expect(txEthCost).to.equal(acceptedEth.add(txGasCost))
    
    const saleUserTokenBalanceIncrease = saleUserTokenBalanceAfter.sub(saleUserTokenBalanceBefore);
    const saleTokenBalanceDecrease = saleTokenBalanceBefore.sub(saleTokenBalanceAfter);
    const tokenUserBalanceIncrease = tokenUserBalanceAfter.sub(tokenUserBalanceBefore);
    
    expect(saleUserTokenBalanceIncrease).to.equal(saleTokenBalanceDecrease);
    expect(tokenUserBalanceIncrease).to.equal(saleTokenBalanceDecrease);

    expect(await this.saleContract.balances(from.address)).to.equal(expectedTokenBalance);

    expect(await this.saleContract.getTokensLeftForSale()).to.equal(saleTokenBalanceAfter);
  };

  beforeEach(async () => {
    const TokenFactory = await ethers.getContractFactory("AIOW");
    this.tokenContract = await TokenFactory.deploy(TOKEN_TOTAL_SUPPLY);
    
    await createTokenSale(to18dec(1_000_000))
  });

  describe('deployment', () => {
    it('reverts if token is address zero', async () => {
      await expectRevert(
        createTokenSale(to18dec(1_000_000), { token: ADDRESS_ZERO }),
        'token_ is 0x0'
      );
    });
    it('reverts if startTime less than now', async () => {
      await expectRevert(
        createTokenSale(to18dec(1_000_000), { startTime: 1 }),
        'startTime_ too low'
      );
    });
    it('reverts if endTime less than startTime', async () => {
      await expectRevert(
        createTokenSale(to18dec(1_000_000), { endTime: 1 }),
        'endTime_ not above startTime_'
      );
    });
    it('reverts if tokensPerUsd is zero', async () => {
      await expectRevert(
        createTokenSale(to18dec(1_000_000), { tokensPerUsd: 0 }),
        'tokensPerUsd_ is 0'
      );
    });
    it('reverts if minBuyToken is zero', async () => {
      await expectRevert(
        createTokenSale(to18dec(1_000_000), { minBuyToken: 0 }),
        'minBuyToken_ is 0'
      );
    });
    it('reverts if maxBuyToken below minBuyToken', async () => {
      await expectRevert(
        createTokenSale(to18dec(1_000_000), { maxBuyToken: 1 }),
        'maxBuyToken_ not above minBuyToken_'
      );
    });
    
  });

  describe('time helpers', () => {

    it('isOpen is false before start time of sale', async () => {
      expect(await this.saleContract.isOpen()).to.equal(false);
    });

    it('hasEnded is false before start time of sale', async () => {
      expect(await this.saleContract.hasEnded()).to.equal(false);
    });

    it('isOpen is true after start time but before end time of sale', async () => {
      await mineBlockAt(await this.saleContract.startTime())
      expect(await this.saleContract.isOpen()).to.equal(true);
    });

    it('hasEnded is false after start time but before end time of sale', async () => {
      await mineBlockAt(await this.saleContract.startTime())
      expect(await this.saleContract.hasEnded()).to.equal(false);
    });

    it('isOpen is false after end time of sale', async () => {
      await mineBlockAt((await this.saleContract.endTime()).add(1))
      expect(await this.saleContract.isOpen()).to.equal(false);
    });

    it('hasEnded is true after end time', async () => {
      await mineBlockAt((await this.saleContract.endTime()).add(1))
      expect(await this.saleContract.hasEnded()).to.equal(true);
    });

  });

  describe('buy tokens', () => {

    it('cannot buy tokens if sale not yet started', async () => {
      await expectRevert(this.saleContract.connect(this.alice).buyTokens(), "sale not open");
    });

    it('cannot buy tokens if sale ended', async () => {
      await mineBlockAt((await this.saleContract.endTime()).add(1))

      await expectRevert(this.saleContract.connect(this.alice).buyTokens(), "sale not open");
    });

    it('cannot buy tokens for zero eth', async () => {
      await mineBlockAt((await this.saleContract.startTime()))

      await expectRevert(this.saleContract.connect(this.alice).buyTokens({ value: ethToWei('0')}), "eth amount is zero");
    });

    it('cannot buy tokens if no tokens left for sale', async () => {
      await createTokenSale(to18dec(50_000));
      await mineBlockAt((await this.saleContract.startTime()))
      
      await this.saleContract.connect(this.alice).buyTokens({ value: ethToWei('1')});
      
      await expectRevert(this.saleContract.connect(this.alice).buyTokens({ value: ethToWei('1')}), "cannot buy more tokens");
    });
    
    it('cannot buy more tokens if already bought max amount of tokens', async () => {
      await mineBlockAt((await this.saleContract.startTime()))
      
      await this.saleContract.connect(this.alice).buyTokens({ value: ethToWei('10')});
      
      await expectRevert(this.saleContract.connect(this.alice).buyTokens({ value: ethToWei('1')}), "cannot buy more tokens");
    });

    it('first buy cannot be less than minimum allowed', async () => {
      await mineBlockAt((await this.saleContract.startTime()))

      await expectRevert(this.saleContract.connect(this.alice).buyTokens({ value: ethToWei('0.001')}), "token amount below minimum");
    });

    it('first buy can be less than minimum if there are less tokens for sale then the minimum', async () => {
      await createTokenSale(to18dec(4_000));
      await mineBlockAt((await this.saleContract.startTime()))

      await this.saleContract.connect(this.alice).buyTokens({ value: ethToWei('0.01')}); // 0,01 * $1337 = $13,37
    });

    it('second buy can be less than minimum allowed', async () => {
      await mineBlockAt((await this.saleContract.startTime()))

      await this.saleContract.connect(this.alice).buyTokens({ value: ethToWei('1')}); // 1 * $1337 = $1337
      this.saleContract.connect(this.alice).buyTokens({ value: ethToWei('0.01')}); // 0,01 * $1337 = $13,37
    });

    it('second buy can be less than minimum if there are less tokens for sale then the minimum', async () => {
      await createTokenSale(to18dec(8_000));
      await mineBlockAt((await this.saleContract.startTime()))

      await this.saleContract.connect(this.alice).buyTokens({ value: ethToWei('0.1')}); // 0.1 * $1337 = $133,7
      await this.saleContract.connect(this.alice).buyTokens({ value: ethToWei('0.01')}); // 0.01 * $1337 = $13,37
    });

    it('if buying less tokens than maximum allowed, gets tokens for all of the eth and no eth refund', async () => {
      await mineBlockAt((await this.saleContract.startTime()))

      await callBuyTokens({
        from: this.alice,
        sendEth: ethToWei('1'), // 1 * $1337 = $1337 worth of tokens
        acceptedEth: ethToWei('1'), // all of it since it's below the maximum allowed
        expectedTokensReceived: to18dec(66_850), // $1337 / $0,02 = 66850 tokens
      });
    });

    it('if buying more tokens than maximum allowed, gets less tokens and eth refund', async () => {
      await mineBlockAt((await this.saleContract.startTime()))

      await callBuyTokens({
        from: this.alice,
        sendEth: ethToWei('10'), // 10 * $1337 = $13370 worth of tokens
        acceptedEth: ethToWei('3.739715781600598354'), // $5000 / $1337 = 3,739715781600598354 ETH
        expectedTokensReceived: to18dec(250_000), // $5000 / $0,02 = 250000 tokens
      });
    });

    it('if buying less than maximum but more tokens than are left for sale, gets all remaining tokens and eth refund', async () => {
      await createTokenSale(to18dec(50_000));

      await mineBlockAt((await this.saleContract.startTime()))

      await callBuyTokens({
        from: this.alice,
        sendEth: ethToWei('1'), // 1 * $1337 = $1337 worth of tokens
        acceptedEth: ethToWei('0.747943156320119670'), // $1000 / $1337 = 0,747943156320119670 ETH
        expectedTokensReceived: to18dec(50_000), // $1000 / $0,02 = 50000 tokens
      });
    });

    it('if buying more than maximum and more tokens than are left for sale, gets all remaining tokens and eth refund', async () => {
      await createTokenSale(to18dec(50_000));

      await mineBlockAt((await this.saleContract.startTime()))

      await callBuyTokens({
        from: this.alice,
        sendEth: ethToWei('10'), // 10 * $1337 = $13370 worth of tokens
        acceptedEth: ethToWei('0.747943156320119670'), // $1000 / $1337 = 0,747943156320119670 ETH
        expectedTokensReceived: to18dec(50_000), // $1000 / $0,02 = 50000 tokens
      });
    });

    it('if buying multiple times, totalling less tokens than maximum allowed, gets tokens for all of the eth and no eth refund', async () => {
      await mineBlockAt((await this.saleContract.startTime()))

      await callBuyTokens({
        from: this.alice,
        sendEth: ethToWei('1'), // 1 * $1337 = $1337 worth of tokens
        acceptedEth: ethToWei('1'), // all of it since it's below the maximum allowed
        expectedTokensReceived: to18dec(66_850), // $1337 / $0,02 = 66850 tokens
      });

      await callBuyTokens({
        from: this.alice,
        sendEth: ethToWei('1'), // 1 * $1337 = $1337 worth of tokens
        acceptedEth: ethToWei('1'), // all of it since it's below the maximum allowed
        expectedTokensReceived: to18dec(66_850), // $1337 / $0,02 = 66850 tokens
        expectedTokenBalance: to18dec(66_850).mul(2),
      });
    });

    it('if buying multiple times, last buy being above max, gets remaining within max and eth refund', async () => {
      await mineBlockAt((await this.saleContract.startTime()))

      await callBuyTokens({
        from: this.alice,
        sendEth: ethToWei('1'), // 1 * $1337 = $1337 worth of tokens
        acceptedEth: ethToWei('1'), // all of it since it's below the maximum allowed
        expectedTokensReceived: to18dec(66_850), // $1337 / $0,02 = 66850 tokens
      });

      await callBuyTokens({
        from: this.alice,
        sendEth: ethToWei('9'), // 9 * $1337 = $12033 worth of tokens
        acceptedEth: ethToWei('2.739715781600598354'), // ($5000 - $1337) / $1337 = 2,739715781600598354 ETH
        expectedTokensReceived: to18dec(183_150), // ($5000 - $1337) / $0,02 = 183150 tokens
        expectedTokenBalance: to18dec(250_000), // the max allowed
      });
    });

  });
  describe('withdraw eth', () => {

    it('cannot  be called if sale did not end', async () => {
      await expectRevert(this.saleContract.withdrawEth(this.carol.address), "sale not ended");
    });
    it('cannot be called by a non-owner', async () => {
      await mineBlockAt((await this.saleContract.endTime()))
      await expectRevert(this.saleContract.connect(this.alice).withdrawEth(this.carol.address), "caller is not the owner");
    });
    it('recipient cannot be address 0', async () => {
      await mineBlockAt((await this.saleContract.endTime()))
      await expectRevert(this.saleContract.withdrawEth(ADDRESS_ZERO), "recipient_ is 0x0");
    });
    it('reverts if there is no eth in the contract', async () => {
      await mineBlockAt((await this.saleContract.endTime()))
      await expectRevert(this.saleContract.withdrawEth(this.carol.address), "no eth to withdraw");
    });
    it('withdraws all eth', async () => {
      await mineBlockAt((await this.saleContract.startTime()))
      
      await callBuyTokens({
        from: this.alice,
        sendEth: ethToWei('1'), // 1 * $1337 = $1337 worth of tokens
        acceptedEth: ethToWei('1'), // all of it since it's below the maximum allowed
        expectedTokensReceived: to18dec(66_850), // $1337 / $0,02 = 66850 tokens
        expectedTokensReceived: to18dec(66_850), // $1337 / $0,02 = 66850 tokens
      });
      
      await mineBlockAt((await this.saleContract.endTime()))
      
      const recipientEthBalanceBefore = await ethers.provider.getBalance(this.carol.address);
      const contractEthBalanceBefore = await ethers.provider.getBalance(this.saleContract.address);
      
      await expect(this.saleContract.withdrawEth(this.carol.address))
        .to.emit(this.saleContract, 'EthWithdraw')
        .withArgs(this.carol.address, to18dec(1))
      
      const recipientEthBalanceAfter = await ethers.provider.getBalance(this.carol.address);
      const contractEthBalanceAfter = await ethers.provider.getBalance(this.saleContract.address);
      
      const recipientEthBalanceIncrease = recipientEthBalanceAfter.sub(recipientEthBalanceBefore);
      const contractEthBalanceDecrease = contractEthBalanceBefore.sub(contractEthBalanceAfter);
      
      expect(contractEthBalanceDecrease).to.equal(recipientEthBalanceIncrease)
      expect(contractEthBalanceAfter).to.equal(0)
      
    });
    it('reverts if already withdrawn all eth', async () => {
      await mineBlockAt((await this.saleContract.startTime()))
      
      await callBuyTokens({
        from: this.alice,
        sendEth: ethToWei('1'), // 1 * $1337 = $1337 worth of tokens
        acceptedEth: ethToWei('1'), // all of it since it's below the maximum allowed
        expectedTokensReceived: to18dec(66_850), // $1337 / $0,02 = 66850 tokens
        expectedTokensReceived: to18dec(66_850), // $1337 / $0,02 = 66850 tokens
      });
      
      await mineBlockAt((await this.saleContract.endTime()))
              
      await expect(this.saleContract.withdrawEth(this.carol.address))
      
      await expectRevert(this.saleContract.withdrawEth(this.carol.address), "no eth to withdraw");
    });
  });
  
  describe('withdraw unsold tokens', () => {

    it('cannot  be called if sale did not end', async () => {
      await expectRevert(this.saleContract.transferUnsoldTokens(this.carol.address), "sale not ended");
    });
    it('cannot be called by a non-owner', async () => {
      await mineBlockAt((await this.saleContract.endTime()))
      await expectRevert(this.saleContract.connect(this.alice).transferUnsoldTokens(this.carol.address), "caller is not the owner");
    });
    it('recipient cannot be address 0', async () => {
      await mineBlockAt((await this.saleContract.endTime()))
      await expectRevert(this.saleContract.transferUnsoldTokens(ADDRESS_ZERO), "recipient_ is 0x0");
    });
    it('withdraws all tokens', async () => {
      await mineBlockAt((await this.saleContract.endTime()))
      
      const tokenRecipientBalanceBefore = await this.tokenContract.balanceOf(this.bob.address);

      await expect(this.saleContract.transferUnsoldTokens(this.bob.address))
        .to.emit(this.saleContract, 'UnsoldTokensWithdraw')
        .withArgs(this.bob.address, to18dec(1_000_000))
      
      const saleTokenBalanceAfter = await this.tokenContract.balanceOf(this.saleContract.address);
      const tokenRecipientBalanceAfter = await this.tokenContract.balanceOf(this.bob.address);
      
      expect(saleTokenBalanceAfter).to.equal(0)
      expect(tokenRecipientBalanceAfter.sub(tokenRecipientBalanceBefore)).to.equal(to18dec(1_000_000))      
    });
    it('reverts if already withdrawn all unsold tokens', async () => {
      await mineBlockAt((await this.saleContract.endTime()))
              
      await expect(this.saleContract.transferUnsoldTokens(this.bob.address))
      
      await expectRevert(this.saleContract.transferUnsoldTokens(this.bob.address), "no tokens to withdraw");
    });
  });
});

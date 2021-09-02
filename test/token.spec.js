const {
  expect,
  BN,
  to18dec,
  TOKEN_TOTAL_SUPPLY,
  ADDRESS_ZERO,
  SECONDS_IN_ONE_DAY,
  getLatestBlockTimestamp,
  expectRevert,
  mineBlockAt
} = require('./helpers');

const TransferRuleType = {
  inbound: 0,
  outbound: 1
};

describe("Token", () => {

  before(async () => {
    const accounts = await ethers.getSigners();
    this.deployer = accounts[0];
    this.alice = accounts[1];
    this.bob = accounts[2];
  });
  
  beforeEach(async () => {
    const TokenFactory = await ethers.getContractFactory("AIOW");
    this.contract = await TokenFactory.deploy(TOKEN_TOTAL_SUPPLY);
  });

  it("has 18 decimals", async () => {
    expect(await this.contract.decimals()).to.equal(18);
  });

  it("symbol is AIOW", async () => {
    expect(await this.contract.symbol()).to.equal('AIOW');
  });

  it("name is AIOW", async () => {
    expect(await this.contract.name()).to.equal('AIOW');
  });

  it("totalSupply is 500 million", async () => {
    expect(await this.contract.totalSupply()).to.equal(TOKEN_TOTAL_SUPPLY);
  });

  it("totalSupply is minted to deployer account", async () => {
    expect(await this.contract.balanceOf(this.deployer.address)).to.equal(TOKEN_TOTAL_SUPPLY);
  });
  
  it("deployer is set as owner", async () => {
    expect(await this.contract.owner()).to.equal(this.deployer.address);
  });
  
  it("deployer can renounce owner role", async () => {
    await this.contract.renounceOwnership();
    expect(await this.contract.owner()).to.equal(ADDRESS_ZERO);
  });
  
  describe('registering transfer rules', () => {
    it("cannot be called by non-owner", async () => {
      await expectRevert(
        this.contract.connect(this.alice).registerTransferRule(
          this.bob.address, 
          TransferRuleType.outbound,
          (await getLatestBlockTimestamp()) + 1000,
          0,
          0,
          0,
          false,
        ),
        'caller is not the owner'
      )
    });
    
    it("account cannot be address zero", async () => {
      await expectRevert(
        this.contract.registerTransferRule(
          ADDRESS_ZERO,
          TransferRuleType.outbound,
          (await getLatestBlockTimestamp()) + 1000,
          0,
          0,
          0,
          false,
        ),
        'account is address zero'
      )
    });
    
    it("cannot have a timelockUntil in the past", async () => {
      await expectRevert(
        this.contract.registerTransferRule(
          this.bob.address,
          TransferRuleType.outbound,
          await getLatestBlockTimestamp(),
          0,
          0,
          0,
          false,
        ),
        'timelockUntil already passed'
      )
    });
    
    it("cannot have both percUnlockedAtTimeUnlock and vestingDurationDays be zero", async () => {
      await expectRevert(
        this.contract.registerTransferRule(
          this.bob.address,
          TransferRuleType.outbound,
          (await getLatestBlockTimestamp()) + 1000,
          0,
          0,
          0,
          false,
        ),
        'percUnlockedAtTimeUnlock and vestingDurationDays are zero'
      )
    });
    
    it("cannot have percUnlockedAtTimeUnlock above 100%", async () => {
      await expectRevert(
        this.contract.registerTransferRule(
          this.bob.address,
          TransferRuleType.outbound,
          (await getLatestBlockTimestamp()) + 1000,
          0,
          0,
          10001, // 100.01%
          false,
        ),
        'percUnlockedAtTimeUnlock above 100%'
      )
    });
    
    describe('outbound transfer rule', () => {
      it("cannot already have an outbound rule", async () => {
        await this.contract.registerTransferRule(
          this.bob.address,
          TransferRuleType.outbound,
          (await getLatestBlockTimestamp()) + 1000,
          0,
          300,
          0,
          false,
        );
        await expectRevert(
          this.contract.registerTransferRule(
            this.bob.address,
            TransferRuleType.outbound,
            (await getLatestBlockTimestamp()) + 1000,
            0,
            300,
            0,
            false,
          ),
          'account already has outbound rule'
        )
      });
      
      it("succeeds, emits correct event, and adds outbound rule in mapping", async () => {
        const timelockUntil = (await getLatestBlockTimestamp()) + 1000;
        await expect(this.contract.registerTransferRule(
          this.bob.address,
          TransferRuleType.outbound,
          timelockUntil,
          0,
          300,
          0,
          false,
        ))
          .to.emit(this.contract, 'TransferRuleOutboundRegistered')
          .withArgs(this.bob.address, [1, timelockUntil, 300, 0])
        
        const outboundRule = await this.contract.transferRulesOutbound(this.bob.address);
        expect(outboundRule.id).to.equal(1);
        expect(outboundRule.timelockUntil).to.equal(timelockUntil);
        expect(outboundRule.vestingDurationDays).to.equal(300);
        expect(outboundRule.percUnlockedAtTimeUnlock).to.equal(0);
      });
    });
    
    describe('inbound transfer rule', () => {
      it("succeeds, emits correct event, and adds inbound rule in mapping", async () => {
        const timelockUntil = (await getLatestBlockTimestamp()) + 1000;
        await expect(this.contract.registerTransferRule(
          this.bob.address,
          TransferRuleType.inbound,
          timelockUntil,
          0,
          300,
          0,
          false,
        ))
          .to.emit(this.contract, 'TransferRuleInboundRegistered')
          .withArgs(this.bob.address, [1, timelockUntil, 300, 0])
        
        const inboundRule = await this.contract.transferRulesInbound(this.bob.address, 0);
        expect(inboundRule.id).to.equal(1);
        expect(inboundRule.timelockUntil).to.equal(timelockUntil);
        expect(inboundRule.vestingDurationDays).to.equal(300);
        expect(inboundRule.percUnlockedAtTimeUnlock).to.equal(0);
        expect(inboundRule.tokens).to.equal(0);
      });
    });
  });
  
  describe('calcBalanceLocked', () => {
    it("returns all tokens if timeLockUntil did not yet pass", async () => {
      await this.contract.registerTransferRule(
        this.deployer.address,
        TransferRuleType.outbound,
        (await getLatestBlockTimestamp()) + 1000,
        0,
        300,
        0,
        false,
      )
      await this.contract.transfer(this.bob.address, to18dec(1000));
      expect(await this.contract.balanceOf(this.bob.address)).to.equal(to18dec(1000));
      expect(await this.contract.calcBalanceLocked(this.bob.address)).to.equal(to18dec(1000));
    });
    
    it("returns all tokens minus percUnlockedAtTimeUnlock when timelockUntil just happened", async () => {
      const timelockUntil = (await getLatestBlockTimestamp()) + 1000;
      await this.contract.registerTransferRule(
        this.deployer.address,
        TransferRuleType.outbound,
        timelockUntil,
        0,
        360,
        1000, // 10%
        false,
      )
      await this.contract.transfer(this.bob.address, to18dec(1000));
      await mineBlockAt(timelockUntil);
      expect(await this.contract.balanceOf(this.bob.address)).to.equal(to18dec(1000));
      expect(await this.contract.calcBalanceLocked(this.bob.address)).to.equal(to18dec(1000).sub(to18dec(1000).mul(10).div(100)));
    });
    
    it("returns all tokens minus percUnlockedAtTimeUnlock and 1 day's rewards, when timelockUntil + 1 day just happened", async () => {
      const timelockUntil = (await getLatestBlockTimestamp()) + 1000;
      await this.contract.registerTransferRule(
        this.deployer.address,
        TransferRuleType.outbound,
        timelockUntil,
        0,
        360,
        1000, // 10%
        false,
      )
      await this.contract.transfer(this.bob.address, to18dec(1000));
      await mineBlockAt(timelockUntil + SECONDS_IN_ONE_DAY);
      expect(await this.contract.balanceOf(this.bob.address)).to.equal(to18dec(1000));
      expect(await this.contract.calcBalanceLocked(this.bob.address)).to.equal(
        to18dec(1000)
          // deduct percUnlockedAtTimeUnlock
          .sub(to18dec(1000).mul(10).div(100))
          // deduct rewards of 1 day
          .sub(to18dec(1000).mul(90).div(100).div(BN(12 * 30))) 
      );
    });
    
    it("returns all tokens, when no percUnlockedAtTimeUnlock and timelockUntil day just happened", async () => {
      const timelockUntil = (await getLatestBlockTimestamp()) + 1000;
      await this.contract.registerTransferRule(
        this.deployer.address,
        TransferRuleType.outbound,
        timelockUntil,
        0,
        360,
        0,
        false,
      )
      await this.contract.transfer(this.bob.address, to18dec(1000));
      await mineBlockAt(timelockUntil);
      expect(await this.contract.balanceOf(this.bob.address)).to.equal(to18dec(1000));
      expect(await this.contract.calcBalanceLocked(this.bob.address)).to.equal(to18dec(1000));
    });
    
    it("returns all tokens minus 1 day's rewards, when no percUnlockedAtTimeUnlock and timelockUntil + 1 day just happened", async () => {
      const timelockUntil = (await getLatestBlockTimestamp()) + 1000;
      await this.contract.registerTransferRule(
        this.deployer.address,
        TransferRuleType.outbound,
        timelockUntil,
        0,
        360,
        0,
        false,
      )
      await this.contract.transfer(this.bob.address, to18dec(1000));
      await mineBlockAt(timelockUntil + SECONDS_IN_ONE_DAY);
      expect(await this.contract.balanceOf(this.bob.address)).to.equal(to18dec(1000));
      expect(await this.contract.calcBalanceLocked(this.bob.address)).to.equal(
        to18dec(1000)
          // deduct rewards of 1 day
          .sub(to18dec(1000).div(BN(12 * 30))) 
      );
    });
    
    it("returns zero tokens when timelockUntil + total vesting days just happened", async () => {
      const timelockUntil = (await getLatestBlockTimestamp()) + 1000;
      await this.contract.registerTransferRule(
        this.deployer.address,
        TransferRuleType.outbound,
        timelockUntil,
        0,
        360,
        0,
        false,
      )
      await this.contract.transfer(this.bob.address, to18dec(1000));
      await mineBlockAt(timelockUntil + (12 * 30 * SECONDS_IN_ONE_DAY));
      expect(await this.contract.balanceOf(this.bob.address)).to.equal(to18dec(1000));
      expect(await this.contract.calcBalanceLocked(this.bob.address)).to.equal(0);
    });
    
    it("returns zero tokens when timelockUntil + perc unlocked 100%", async () => {
      const timelockUntil = (await getLatestBlockTimestamp()) + 1000;
      await this.contract.registerTransferRule(
        this.deployer.address,
        TransferRuleType.outbound,
        timelockUntil,
        0,
        0,
        10000,
        false,
      )
      await this.contract.transfer(this.bob.address, to18dec(1000));
      await mineBlockAt(timelockUntil);
      expect(await this.contract.balanceOf(this.bob.address)).to.equal(to18dec(1000));
      expect(await this.contract.calcBalanceLocked(this.bob.address)).to.equal(0);
    });
  });
  
  describe('_beforeTokenTransfer', () => {
    it("creates inbound rule when sender has outbound rule", async () => {
      const timelockUntil = (await getLatestBlockTimestamp()) + 1000;
      await this.contract.registerTransferRule(
        this.deployer.address,
        TransferRuleType.outbound,
        timelockUntil,
        0,
        300,
        0,
        false,
      )
      const outboundRuleId = (await this.contract.transferRulesOutbound(this.deployer.address)).id;
      await this.contract.transfer(this.alice.address, to18dec(1000));
      expect(await this.contract.balanceOf(this.alice.address)).to.equal(to18dec(1000));
      expect(await this.contract.getInboundTransferRules(this.alice.address)).to.have.lengthOf(1);
      const inboundRule = (await this.contract.getInboundTransferRules(this.alice.address))[0]
      expect(inboundRule.id).to.equal(outboundRuleId);
      expect(inboundRule.timelockUntil).to.equal(timelockUntil);
      expect(inboundRule.vestingDurationDays).to.equal(300);
      expect(inboundRule.percUnlockedAtTimeUnlock).to.equal(0);
      expect(inboundRule.tokens).to.equal(to18dec(1000));
    });
    
    it("adds to existing inbound rule tokens if same outbound rule transfers more tokens to recipient", async () => {
      const timelockUntil = (await getLatestBlockTimestamp()) + 1000;
      await this.contract.registerTransferRule(
        this.deployer.address,
        TransferRuleType.outbound,
        timelockUntil,
        0,
        300,
        0,
        false,
      )
      const outboundRuleId = (await this.contract.transferRulesOutbound(this.deployer.address)).id;
      await this.contract.transfer(this.alice.address, to18dec(1000));
      await this.contract.transfer(this.alice.address, to18dec(1000));
      expect(await this.contract.balanceOf(this.alice.address)).to.equal(to18dec(2000));
      expect(await this.contract.getInboundTransferRules(this.alice.address)).to.have.lengthOf(1);
      const inboundRule = (await this.contract.getInboundTransferRules(this.alice.address))[0]
      expect(inboundRule.id).to.equal(outboundRuleId);
      expect(inboundRule.timelockUntil).to.equal(timelockUntil);
      expect(inboundRule.vestingDurationDays).to.equal(300);
      expect(inboundRule.percUnlockedAtTimeUnlock).to.equal(0);
      expect(inboundRule.tokens).to.equal(to18dec(2000));      
    });
    
    it("adds to inbound rule of recipient if recipient is a pool and sender has no outbound rules", async () => {
      const timelockUntil = (await getLatestBlockTimestamp()) + 1000;
      expect(await this.contract.getInboundTransferRules(this.alice.address)).to.have.lengthOf(0);
      await this.contract.registerTransferRule(
        this.alice.address,
        TransferRuleType.inbound,
        timelockUntil,
        0,
        300,
        0,
        true,
      )
      const inboundRuleId = (await this.contract.transferRulesInbound(this.alice.address, 0)).id;
      
      {
        expect((await this.contract.transferRulesOutbound(this.alice.address)).id).to.equal(0);
        expect(await this.contract.getInboundTransferRules(this.alice.address)).to.have.lengthOf(1);
        expect(await this.contract.balanceOf(this.alice.address)).to.equal(to18dec(0));
        const inboundRule = (await this.contract.getInboundTransferRules(this.alice.address))[0]
        expect(inboundRule.id).to.equal(inboundRuleId);
        expect(inboundRule.timelockUntil).to.equal(timelockUntil);
        expect(inboundRule.vestingDurationDays).to.equal(300);
        expect(inboundRule.percUnlockedAtTimeUnlock).to.equal(0);
        expect(inboundRule.tokens).to.equal(to18dec(0));      
        expect(inboundRule.isPool).to.equal(true);
      }
      
      await this.contract.transfer(this.alice.address, to18dec(1000));
      
      {
        expect((await this.contract.transferRulesOutbound(this.alice.address)).id).to.equal(0);
        expect(await this.contract.getInboundTransferRules(this.alice.address)).to.have.lengthOf(1);
        expect(await this.contract.balanceOf(this.alice.address)).to.equal(to18dec(1000));
        const inboundRule = (await this.contract.getInboundTransferRules(this.alice.address))[0]
        expect(inboundRule.id).to.equal(inboundRuleId);
        expect(inboundRule.timelockUntil).to.equal(timelockUntil);
        expect(inboundRule.vestingDurationDays).to.equal(300);
        expect(inboundRule.percUnlockedAtTimeUnlock).to.equal(0);
        expect(inboundRule.tokens).to.equal(to18dec(1000));      
        expect(inboundRule.isPool).to.equal(true);      
      }
      
      await this.contract.transfer(this.alice.address, to18dec(500));
      
      {
        expect((await this.contract.transferRulesOutbound(this.alice.address)).id).to.equal(0);
        expect(await this.contract.getInboundTransferRules(this.alice.address)).to.have.lengthOf(1);
        expect(await this.contract.balanceOf(this.alice.address)).to.equal(to18dec(1500));
        const inboundRule = (await this.contract.getInboundTransferRules(this.alice.address))[0]
        expect(inboundRule.id).to.equal(inboundRuleId);
        expect(inboundRule.timelockUntil).to.equal(timelockUntil);
        expect(inboundRule.vestingDurationDays).to.equal(300);
        expect(inboundRule.percUnlockedAtTimeUnlock).to.equal(0);
        expect(inboundRule.tokens).to.equal(to18dec(1500));      
        expect(inboundRule.isPool).to.equal(true);      
      }
    });
    
    it("adds to inbound rule of recipient, and does not apply outbound rule, if recipient is a pool and sender has outbound rule", async () => {
      const timelockUntil = (await getLatestBlockTimestamp()) + 1000;
      await this.contract.registerTransferRule(
        this.deployer.address,
        TransferRuleType.outbound,
        timelockUntil,
        0,
        300,
        0,
        false,
      )      
      expect(await this.contract.getInboundTransferRules(this.alice.address)).to.have.lengthOf(0);
      await this.contract.registerTransferRule(
        this.alice.address,
        TransferRuleType.inbound,
        timelockUntil,
        0,
        300,
        0,
        true,
      )
      const inboundRuleId = (await this.contract.transferRulesInbound(this.alice.address, 0)).id;
      
      {
        expect((await this.contract.transferRulesOutbound(this.alice.address)).id).to.equal(0);
        expect(await this.contract.getInboundTransferRules(this.alice.address)).to.have.lengthOf(1);
        expect(await this.contract.balanceOf(this.alice.address)).to.equal(to18dec(0));
        const inboundRule = (await this.contract.getInboundTransferRules(this.alice.address))[0]
        expect(inboundRule.id).to.equal(inboundRuleId);
        expect(inboundRule.timelockUntil).to.equal(timelockUntil);
        expect(inboundRule.vestingDurationDays).to.equal(300);
        expect(inboundRule.percUnlockedAtTimeUnlock).to.equal(0);
        expect(inboundRule.tokens).to.equal(to18dec(0));      
        expect(inboundRule.isPool).to.equal(true);
      }
      
      await this.contract.transfer(this.alice.address, to18dec(1000));
      
      {
        expect((await this.contract.transferRulesOutbound(this.alice.address)).id).to.equal(0);
        expect(await this.contract.getInboundTransferRules(this.alice.address)).to.have.lengthOf(1);
        expect(await this.contract.balanceOf(this.alice.address)).to.equal(to18dec(1000));
        const inboundRule = (await this.contract.getInboundTransferRules(this.alice.address))[0]
        expect(inboundRule.id).to.equal(inboundRuleId);
        expect(inboundRule.timelockUntil).to.equal(timelockUntil);
        expect(inboundRule.vestingDurationDays).to.equal(300);
        expect(inboundRule.percUnlockedAtTimeUnlock).to.equal(0);
        expect(inboundRule.tokens).to.equal(to18dec(1000));      
        expect(inboundRule.isPool).to.equal(true);      
      }
      
      await this.contract.transfer(this.alice.address, to18dec(500));
      
      {
        expect((await this.contract.transferRulesOutbound(this.alice.address)).id).to.equal(0);
        expect(await this.contract.getInboundTransferRules(this.alice.address)).to.have.lengthOf(1);
        expect(await this.contract.balanceOf(this.alice.address)).to.equal(to18dec(1500));
        const inboundRule = (await this.contract.getInboundTransferRules(this.alice.address))[0]
        expect(inboundRule.id).to.equal(inboundRuleId);
        expect(inboundRule.timelockUntil).to.equal(timelockUntil);
        expect(inboundRule.vestingDurationDays).to.equal(300);
        expect(inboundRule.percUnlockedAtTimeUnlock).to.equal(0);
        expect(inboundRule.tokens).to.equal(to18dec(1500));      
        expect(inboundRule.isPool).to.equal(true);      
      }
    });
    
    it("when multiple outbound rules adds tokens to the correct existing inbound rule", async () => {
      const timelockUntil = (await getLatestBlockTimestamp()) + 1000;
      await this.contract.registerTransferRule(
        this.deployer.address,
        TransferRuleType.outbound,
        timelockUntil,
        0,
        0,
        10000,
        false,
      )
      await this.contract.registerTransferRule(
        this.bob.address,
        TransferRuleType.outbound,
        timelockUntil,
        0,
        0,
        10000,
        false,
      )
      
      await mineBlockAt(timelockUntil);

      const outboundRule1Id = (await this.contract.transferRulesOutbound(this.deployer.address)).id;
      const outboundRule2Id = (await this.contract.transferRulesOutbound(this.bob.address)).id;
      
      { // deployer 10000 => bob
        await this.contract.transfer(this.bob.address, to18dec(10000));
        expect(await this.contract.balanceOf(this.bob.address)).to.equal(to18dec(10000));
        expect(await this.contract.getInboundTransferRules(this.bob.address)).to.have.lengthOf(1);
        const inboundRule = (await this.contract.getInboundTransferRules(this.bob.address))[0]
        expect(inboundRule.id).to.equal(outboundRule1Id);
        expect(inboundRule.timelockUntil).to.equal(timelockUntil);
        expect(inboundRule.vestingDurationDays).to.equal(0);
        expect(inboundRule.percUnlockedAtTimeUnlock).to.equal(10000);
        expect(inboundRule.tokens).to.equal(to18dec(10000));   
      }
      
      { // bob 1000 => alice
        await this.contract.connect(this.bob).transfer(this.alice.address, to18dec(1000));
        expect(await this.contract.balanceOf(this.alice.address)).to.equal(to18dec(1000));
        expect(await this.contract.getInboundTransferRules(this.alice.address)).to.have.lengthOf(1);
        const inboundRule = (await this.contract.getInboundTransferRules(this.alice.address))[0]
        expect(inboundRule.id).to.equal(outboundRule2Id);
        expect(inboundRule.timelockUntil).to.equal(timelockUntil);
        expect(inboundRule.vestingDurationDays).to.equal(0);
        expect(inboundRule.percUnlockedAtTimeUnlock).to.equal(10000);
        expect(inboundRule.tokens).to.equal(to18dec(1000));      
      }
      
      { // deployer 1000 => alice
        await this.contract.transfer(this.alice.address, to18dec(1000));
        expect(await this.contract.balanceOf(this.alice.address)).to.equal(to18dec(2000));
        expect(await this.contract.getInboundTransferRules(this.alice.address)).to.have.lengthOf(2);
        const inboundRule = (await this.contract.getInboundTransferRules(this.alice.address))[1]
        expect(inboundRule.id).to.equal(outboundRule1Id);
        expect(inboundRule.timelockUntil).to.equal(timelockUntil);
        expect(inboundRule.vestingDurationDays).to.equal(0);
        expect(inboundRule.percUnlockedAtTimeUnlock).to.equal(10000);
        expect(inboundRule.tokens).to.equal(to18dec(1000)); 
      }
      
      { // bob 1000 => alice
        await this.contract.connect(this.bob).transfer(this.alice.address, to18dec(1000));
        expect(await this.contract.balanceOf(this.alice.address)).to.equal(to18dec(3000));
        expect(await this.contract.getInboundTransferRules(this.alice.address)).to.have.lengthOf(2);
        const inboundRule = (await this.contract.getInboundTransferRules(this.alice.address))[0]
        expect(inboundRule.id).to.equal(outboundRule2Id);
        expect(inboundRule.timelockUntil).to.equal(timelockUntil);
        expect(inboundRule.vestingDurationDays).to.equal(0);
        expect(inboundRule.percUnlockedAtTimeUnlock).to.equal(10000);
        expect(inboundRule.tokens).to.equal(to18dec(2000));
      }
      
      { // deployer 2000 => alice
        await this.contract.transfer(this.alice.address, to18dec(2000));
        expect(await this.contract.balanceOf(this.alice.address)).to.equal(to18dec(5000));
        expect(await this.contract.getInboundTransferRules(this.alice.address)).to.have.lengthOf(2);
        const inboundRule = (await this.contract.getInboundTransferRules(this.alice.address))[1]
        expect(inboundRule.id).to.equal(outboundRule1Id);
        expect(inboundRule.timelockUntil).to.equal(timelockUntil);
        expect(inboundRule.vestingDurationDays).to.equal(0);
        expect(inboundRule.percUnlockedAtTimeUnlock).to.equal(10000);
        expect(inboundRule.tokens).to.equal(to18dec(3000)); 
      }
      
      { // alice 500 => bob
        await this.contract.connect(this.alice).transfer(this.bob.address, to18dec(500));
        
        {
          expect(await this.contract.balanceOf(this.bob.address)).to.equal(to18dec(8500));
          expect(await this.contract.getInboundTransferRules(this.bob.address)).to.have.lengthOf(1);
          const inboundRule = (await this.contract.getInboundTransferRules(this.bob.address))[0]
          expect(inboundRule.id).to.equal(outboundRule1Id);
          expect(inboundRule.timelockUntil).to.equal(timelockUntil);
          expect(inboundRule.vestingDurationDays).to.equal(0);
          expect(inboundRule.percUnlockedAtTimeUnlock).to.equal(10000);
          expect(inboundRule.tokens).to.equal(to18dec(10000)); 
        }
        
        expect(await this.contract.balanceOf(this.alice.address)).to.equal(to18dec(4500));
        expect(await this.contract.getInboundTransferRules(this.alice.address)).to.have.lengthOf(2);
          
        {
          const inboundRule = (await this.contract.getInboundTransferRules(this.alice.address))[0]
          expect(inboundRule.id).to.equal(outboundRule2Id);
          expect(inboundRule.timelockUntil).to.equal(timelockUntil);
          expect(inboundRule.vestingDurationDays).to.equal(0);
          expect(inboundRule.percUnlockedAtTimeUnlock).to.equal(10000);
          expect(inboundRule.tokens).to.equal(to18dec(2000)); 
        }
        
        {
          const inboundRule = (await this.contract.getInboundTransferRules(this.alice.address))[1]
          expect(inboundRule.id).to.equal(outboundRule1Id);
          expect(inboundRule.timelockUntil).to.equal(timelockUntil);
          expect(inboundRule.vestingDurationDays).to.equal(0);
          expect(inboundRule.percUnlockedAtTimeUnlock).to.equal(10000);
          expect(inboundRule.tokens).to.equal(to18dec(3000)); 
        }
        
        expect((await this.contract.transferRulesOutbound(this.alice.address)).id).to.equal(0);
      }
    });
    
    it("reverts when trying to transfer more tokens than are unlocked", async () => {
      const timelockUntil = (await getLatestBlockTimestamp()) + 1000;
      await this.contract.registerTransferRule(
        this.deployer.address,
        TransferRuleType.outbound,
        timelockUntil,
        0,
        360,
        0,
        false,
      )
      await this.contract.transfer(this.alice.address, to18dec(1000));
      await mineBlockAt(timelockUntil + SECONDS_IN_ONE_DAY);
      await expectRevert( 
        this.contract.connect(this.alice).transfer(this.bob.address, to18dec(200)),
        "insufficient unlocked tokens"
      );      
    });
  });
});

//SPDX-License-Identifier: MIT
pragma solidity 0.8.7;

import "../helpers/PriceFetcher.sol";
import "../interfaces/IERC20.sol";
import "../helpers/Ownable.sol";

contract TokenSale is Ownable, PriceFetcher {
    uint public constant BASE = 10**18;

    IERC20 public immutable token;

    uint public immutable startTime;
    uint public immutable endTime;

    uint public immutable tokensPerUsd;

    uint public immutable minBuyToken;
    uint public immutable maxBuyToken;

    mapping(address => uint256) public balances;

    event TokenPurchase(address indexed beneficiary, uint ethAmount, uint tokenAmount);
    event TokenWithdraw(address indexed beneficiary, uint tokenAmount);
    event EthWithdraw(address indexed recipient, uint ethAmount);
    event UnsoldTokensWithdraw(address indexed recipient, uint tokenAmount);

    constructor(
        address token_,
        address priceFeed_,
        uint minBuyToken_,
        uint maxBuyToken_,
        uint startTime_,
        uint endTime_,
        uint tokensPerUsd_
    ) PriceFetcher(priceFeed_) {
        require(token_ != address(0), "token_ is 0x0");
        require(startTime_ >= block.timestamp, "startTime_ too low");
        require(endTime_ > startTime_, "endTime_ not above startTime_");
        require(tokensPerUsd_ > 0, "tokensPerUsd_ is 0");
        require(minBuyToken_ > 0, "minBuyToken_ is 0");
        require(maxBuyToken_ > minBuyToken_, "maxBuyToken_ not above minBuyToken_");

        token = IERC20(token_);
        startTime = startTime_;
        endTime = endTime_;
        tokensPerUsd = tokensPerUsd_;
        minBuyToken = minBuyToken_;
        maxBuyToken = maxBuyToken_;
    }

    function getTokensLeftForSale() public view returns (uint256) {
        return token.balanceOf(address(this));
    }

    function ethToToken(uint amountEth_) public view returns (uint amountToken) {
        amountToken = amountEth_ * getEthUsdPrice() * tokensPerUsd / BASE / BASE;
    }

    function tokenToEth(uint amountToken_) public view returns (uint amountEth) {
        amountEth = (amountToken_ * BASE * BASE / getEthUsdPrice() / tokensPerUsd);
    }

    function isOpen() public view returns (bool) {
        return block.timestamp >= startTime && block.timestamp <= endTime;
    }
    modifier saleIsOpen {
        require(isOpen(), "sale not open");
        _;
    }

    function hasEnded() public view returns (bool) {
        return block.timestamp > endTime;
    }
    modifier saleHasEnded {
        require(hasEnded(), "sale not ended");
        _;
    }
    
    function getMaxTokensAllowedToBuyOf(address account_) public view returns (uint) {
        uint tokensLeftForSale = token.balanceOf(address(this));
        if (tokensLeftForSale == 0) return 0;
        
        // check how many tokens the account is allowed to purchase
        // if the account already called buyTokens before than he will already have a balance
        uint tokensAllowedToBuy = maxBuyToken - balances[account_];
        if (tokensAllowedToBuy == 0) return 0;
        
        if (tokensAllowedToBuy > tokensLeftForSale) {
            // there are less tokens leftover than what the user is allowed to purchase
            // set tokensAllowedToBuy to whatever is leftover
            tokensAllowedToBuy = tokensLeftForSale;
        }
        
        return tokensAllowedToBuy;
    }
    
    function getMinTokensAllowedToBuyOf(address account_) public view returns (uint) {
        uint tokensLeftForSale = token.balanceOf(address(this));
        
        // there are no tokens left in the sale
        if (tokensLeftForSale == 0) return 0;
        
        uint leftToBuy = maxBuyToken - balances[account_];
        
        // user bought all tokens that he is allowed to
        if (leftToBuy == 0) return 0;
        
        // user didnt buy anything yet
        if (leftToBuy == maxBuyToken) {
            // there are less tokens for sale than the min buy amount
            if (tokensLeftForSale < minBuyToken) return 1;
            
            // there are more tokens for sale than the min buy amount
            return minBuyToken;
        }
        
        // user must've already bought tokens, but he didnt yet buy the max amount
        // there also must still be tokens left for sale
        return 1;
    }

    function buyTokens() saleIsOpen public virtual payable {
        require(msg.value > 0, "eth amount is zero");
        
        uint _ethIn = msg.value;
        
        uint tokensAllowedToBuy = getMaxTokensAllowedToBuyOf(msg.sender);
        require(tokensAllowedToBuy > 0, "cannot buy more tokens");

        // calculate how much tokens can be bought for the input eth amount
        uint tokensToBuy = ethToToken(msg.value);
        require(tokensToBuy > 0, "cannot buy zero tokens");
        
        // a user is allowed to buy less than the minimum amount of tokens when:
        // - this isn't the first purchase of tokens
        // - there are less than minBuyToken tokens left in this token sale
        // Otherwise, the user needs to purchase at least the minBuyToken amount of tokens
        require(balances[msg.sender] > 0 || tokensAllowedToBuy < minBuyToken || tokensToBuy >= minBuyToken, "token amount below minimum");

        // calculate the actual tokens to buy, in case a part needs to be refunded
        uint ethToRefund;
        if (tokensToBuy > tokensAllowedToBuy) {
            tokensToBuy = tokensAllowedToBuy;
            ethToRefund = _ethIn - tokenToEth(tokensToBuy);
            _ethIn -= ethToRefund;
            require(_ethIn > 0, "ethIn zero after refund calculation");
        }
        
        balances[msg.sender] += tokensToBuy;
        token.transfer(msg.sender, tokensToBuy);
        
        emit TokenPurchase(msg.sender, _ethIn, tokensToBuy);
        
        if (ethToRefund > 0) {
            (bool success,) = payable(msg.sender).call{value: ethToRefund}("");
            require(success, "eth refund failed");
        }
    }

    function withdrawEth(address payable recipient_) saleHasEnded onlyOwner external {
        require(recipient_ != address(0), "recipient_ is 0x0");
        uint ethBalance = address(this).balance;
        require(ethBalance > 0, "no eth to withdraw");
        (bool success,) = recipient_.call{value: ethBalance}("");
        require(success, "withdraw eth transfer failed");
        emit EthWithdraw(recipient_, ethBalance);
    }
    
    function transferUnsoldTokens(address recipient_) saleHasEnded onlyOwner external {
        require(recipient_ != address(0), "recipient_ is 0x0");
        uint unsoldTokens = token.balanceOf(address(this));
        require(unsoldTokens > 0, "no tokens to withdraw");
        token.transfer(recipient_, unsoldTokens);
        emit UnsoldTokensWithdraw(recipient_, unsoldTokens);
    }
}

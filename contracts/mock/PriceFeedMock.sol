//SPDX-License-Identifier: MIT
pragma solidity 0.8.7;

// used for testing
contract PriceFeedMock {
    uint priceToReturn;
    
    constructor(uint priceToReturn_) {
      priceToReturn = priceToReturn_;
    }
    
    function updatePrice(uint priceToReturn_) external {
      priceToReturn = priceToReturn_;
    }
    
    function latestRoundData() public view returns (
      uint80 roundID,
      int price,
      uint startedAt,
      uint timeStamp,
      uint80 answeredInRound
    ) {
      roundID = 1;
      //chainlink uses 8 decimals, for example, price = 221787782879, means 1 ETH = 2217,87782879 USD
      price = int(priceToReturn);
      startedAt = 1;
      timeStamp = 1;
      answeredInRound = 1;
    }
}

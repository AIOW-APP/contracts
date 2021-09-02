//SPDX-License-Identifier: MIT
pragma solidity 0.8.7;

import "./TokenSale.sol";

contract TokenSalePresale is TokenSale {

  constructor(
      address token_,
      address priceFeed_,
      uint minBuyToken_,
      uint maxBuyToken_,
      uint startTime_,
      uint endTime_,
      uint tokensPerUsd_
  ) TokenSale(token_, priceFeed_, minBuyToken_, maxBuyToken_, startTime_, endTime_, tokensPerUsd_) {}
}
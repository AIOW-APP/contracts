//SPDX-License-Identifier: MIT
pragma solidity 0.8.7;

import "../interfaces/AggregatorV3Interface.sol";

abstract contract PriceFetcher {
    AggregatorV3Interface public immutable priceFeed; // ETH/USD

    constructor(address priceFeed_) {
        require(priceFeed_ != address(0), "priceFeed_ is 0x0");

        priceFeed = AggregatorV3Interface(priceFeed_);
    }

    function getEthUsdPrice() public view returns (uint) {
        (,int price,,,) = priceFeed.latestRoundData();
        require(price > 0, "incorrect price");
        // chainlink returns 8 decimals, so add 10 decimals
        return uint(price) * 10**10;
    }
}

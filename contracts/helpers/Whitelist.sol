//SPDX-License-Identifier: MIT
pragma solidity 0.8.7;

import "./Ownable.sol";

contract Whitelist is Ownable {
  event WhitelistAdded(address account);
  event WhitelistRemoved(address account);
  
  mapping (address => bool) public whitelist;
  
  function whitelistAdd(address account_) public onlyOwner {
    _whitelistAdd(account_);
  }
  
  function _whitelistAdd(address account_) internal {
    require(account_ != address(0), "account is 0x0");
    require(!whitelist[account_], "already whitelisted");
    whitelist[account_] = true;
    emit WhitelistAdded(account_);
  }
  
  function whitelistBatchAdd(address[] calldata accounts_) external onlyOwner {
    for (uint i = 0; i < accounts_.length; i++) {
      _whitelistAdd(accounts_[i]);
    }
  }
  
  function whitelistRemove(address account_) external onlyOwner {
    require(whitelist[account_], "not whitelisted");
    whitelist[account_] = false;
    emit WhitelistRemoved(account_);
  }
}
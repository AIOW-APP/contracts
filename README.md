# AIOW contracts

This repo contains the AIOW ethereum smart contracts.

![logo](https://aiow.io/wp-content/uploads/2021/06/AIOW-logo.svg)

## Info

See [this page](https://aiow.io/tokenomics) for information about the various tokensales, pools, and total supply of the token.

## Token Info

The AIOW ERC20 token contract is a basic ERC20 token contract with the addition of inbound and outbound transferrules.
These transferrules are used to implement locking of tokens until a certain date, and the vesting of tokens.

The ERC20 token contract has an owner, who has the sole right to register transferrules. 
**Once all transferrules have been registered, and all tokens are transferred to the pools, the owner will renounce his owner role!**

## Deployment

- AIOW token: [0xd1DBEE5d30eDAac4A4340358E269E7F14E09E26E](https://etherscan.io/address/0xd1DBEE5d30eDAac4A4340358E269E7F14E09E26E)
- Private tokensale: [0x7c317c4ad47c35f71845ad7b9de397e35d7ce29c](https://etherscan.io/address/0x7c317c4ad47c35f71845ad7b9de397e35d7ce29c)
- Strategic tokensale: [0x6fa4aad6e24f8ea38a177726192cf28f60b105f4](https://etherscan.io/address/0x6fa4aad6e24f8ea38a177726192cf28f60b105f4)
- Presale tokensale: [0xC39E4F03409ca20e11Bc46a63f1Ffc074891DEd3](https://etherscan.io/address/0xC39E4F03409ca20e11Bc46a63f1Ffc074891DEd3)
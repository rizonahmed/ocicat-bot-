export const TOKEN_ADDRESS =
  "0xE53D384Cf33294C1882227ae4f90D64cF2a5dB70";

export const STAKING_ADDRESS =
  "0xBA86A0583ffAb99FC49DA80AE696fDcb8B5deb8a";

  export const STAKING_ABI = [
  "function totalUserStaked(address) view returns (uint256)"
];

export const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];
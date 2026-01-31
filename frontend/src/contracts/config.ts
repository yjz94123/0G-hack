import USDCAbi from './abis/USDC.json';
import TradingHubAbi from './abis/TradingHub.json';

export const CONTRACTS = {
  USDC: {
    address: '0x0F0dC21FcC101173BD742F9CfEa8d6e68Ada4031' as `0x${string}`,
    abi: USDCAbi,
  },
  TradingHub: {
    address: '0x8CaEe372b8cec0F5850eCbA4276b5e631a51192E' as `0x${string}`,
    abi: TradingHubAbi,
  },
} as const;

export const OUTCOME = {
  NO: 0,
  YES: 1,
} as const;

export const USDC_DECIMALS = 6;
export const MAX_MINT_AMOUNT = 10000; // 10,000 USDC
export const MINT_COOLDOWN = 3600; // 1 hour in seconds

import USDCAbi from './abis/USDC.json';
import TradingHubAbi from './abis/TradingHub.json';

export const CONTRACTS = {
  USDC: {
    address: '0x820b29e2AeEc48a351cd2c9dE9111924a7bA6203' as `0x${string}`,
    abi: USDCAbi,
  },
  TradingHub: {
    address: '0xBd20E09Bc18EEba5C72434BED27a0CBe8661ac57' as `0x${string}`,
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

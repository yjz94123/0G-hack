// Contract configuration
export { CONTRACTS, OUTCOME, USDC_DECIMALS, MAX_MINT_AMOUNT, MINT_COOLDOWN } from './config';

// USDC hooks
export {
  useUSDCBalance,
  useUSDCAllowance,
  useMintUSDC,
  useApproveUSDC,
  useLastMintTime,
  useMaxMintAmount,
  useMintCooldown,
} from './hooks/useUSDC';

// TradingHub hooks
export {
  useOrder,
  useUserOrders,
  useMarketOrders,
  useUserMarketOrders,
  useTotalOrders,
  useWatchOrderPlaced,
  useWatchOrderSettled,
  useWatchMarketSettled,
  useTradingHubEvents,
} from './hooks/useTradingHub';

// Types
export type { Order } from './hooks/useTradingHub';

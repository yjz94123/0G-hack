/** 交易类型 */
export type TradeType = 'buy' | 'sell';

/** 交易状态 */
export type TradeStatus = 'pending' | 'filled' | 'cancelled';

/** 交易记录 */
export interface TradeRecord {
  tradeId: string;
  userAddress: string;
  marketId: string;
  eventId: string;
  marketTitle: string;
  outcome: 'YES' | 'NO';
  price: number;
  amount: number;
  tradeType: TradeType;
  status: TradeStatus;
  onchainOrderId: number;
  txHash: string;
  ogStorageKey: string;
  ogRootHash: string;
  createdAt: string;
  updatedAt: string;
}

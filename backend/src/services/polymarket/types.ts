/** Gamma API 返回的原始事件结构 */
export interface GammaEvent {
  id: string;
  ticker: string;
  slug: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  active: boolean;
  closed: boolean;
  archived: boolean;
  liquidity: number;
  volume: number;
  markets: GammaMarket[];
  tags: { id: string; label: string; slug: string }[];
  image: string;
  icon: string;
  commentCount: number;
}

/** Gamma API 返回的原始市场结构 */
export interface GammaMarket {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  endDate: string;
  liquidity: string;
  volume: string;
  active: boolean;
  closed: boolean;
  outcomes: string; // JSON string: '["Yes","No"]'
  outcomePrices: string; // JSON string: '[0.65, 0.35]'
  clobTokenIds: string; // JSON string
  acceptingOrders: boolean;
}

/** CLOB API 返回的订单簿结构 */
export interface ClobOrderBook {
  market: string;
  asset_id: string;
  hash: string;
  timestamp: string;
  bids: ClobOrderBookEntry[];
  asks: ClobOrderBookEntry[];
}

export interface ClobOrderBookEntry {
  price: string;
  size: string;
}

/** CLOB API 返回的价格结构 */
export interface ClobPriceResponse {
  price: string;
}

/** CLOB API 返回的市场结构 */
export interface ClobMarket {
  condition_id: string;
  tokens: ClobToken[];
  min_incentive_size: string;
  max_incentive_spread: string;
  active: boolean;
  closed: boolean;
  accepting_orders: boolean;
  accepting_order_timestamp: string;
}

export interface ClobToken {
  token_id: string;
  outcome: string;
  price: number;
  winner: boolean;
}

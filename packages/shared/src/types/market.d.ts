/** 标签 */
export interface Tag {
    slug: string;
    label: string;
}
/** 订单簿条目 */
export interface OrderBookEntry {
    price: string;
    size: string;
}
/** 订单簿单侧 */
export interface OrderBookSide {
    bids: OrderBookEntry[];
    asks: OrderBookEntry[];
    bestBid: string;
    bestAsk: string;
    spread: string;
    midpoint: string;
}
/** 订单簿数据 (YES + NO) */
export interface OrderBookData {
    yes: OrderBookSide;
    no: OrderBookSide;
    hash: string;
    timestamp: string;
}
/** 子市场摘要 (列表页) */
export interface MarketSummary {
    marketId: string;
    conditionId: string;
    question: string;
    outcomes: string[];
    outcomePrices: string[];
    lastTradePrice: string;
    bestBid: string;
    bestAsk: string;
    spread: number;
    volume: string;
    onchainMarketId: string;
}
/** 子市场详情 (详情页) */
export interface MarketDetail extends MarketSummary {
    clobTokenIds: string[];
    resolutionStatus: 0 | 1 | 2;
    acceptingOrders: boolean;
    polymarketOrderBook: OrderBookData;
}
/** 事件摘要 (列表页) */
export interface EventSummary {
    eventId: string;
    slug: string;
    title: string;
    description: string;
    imageUrl: string | null;
    iconUrl: string | null;
    startDate: string;
    endDate: string;
    active: boolean;
    closed: boolean;
    featured: boolean;
    volume: number;
    volume24h: number;
    liquidity: number;
    openInterest: number;
    tags: Tag[];
    markets: MarketSummary[];
    syncedAt: string;
}
/** 事件详情 (详情页) */
export interface EventDetail extends Omit<EventSummary, 'markets'> {
    resolutionSource: string | null;
    markets: MarketDetail[];
}
/** 价格历史点 */
export interface PricePoint {
    timestamp: number;
    price: number;
}
/** 价格历史 */
export interface PriceHistory {
    marketId: string;
    outcome: string;
    interval: string;
    history: PricePoint[];
}
//# sourceMappingURL=market.d.ts.map
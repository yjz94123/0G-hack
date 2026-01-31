import { apiGet, apiPost } from './client';
import type {
  EventSummary,
  EventDetail,
  OrderBookData,
  PriceHistory,
  AnalysisTask,
} from '@og-predict/shared';

/** 获取事件列表 */
export function fetchEvents(params?: {
  limit?: number;
  offset?: number;
  tag?: string;
  sortBy?: string;
}) {
  return apiGet<{ events: EventSummary[]; pagination: unknown }>('/markets/events', params);
}

/** 获取事件详情（含子市场） */
export function fetchEventDetail(eventId: string) {
  return apiGet<EventDetail>(`/markets/events/${eventId}`);
}

/** 获取订单簿 */
export function fetchOrderBook(tokenId: string) {
  return apiGet<OrderBookData>(`/markets/orderbook/${tokenId}`);
}

/** 获取价格历史 */
export function fetchPriceHistory(conditionId: string, params?: {
  interval?: string;
  limit?: number;
}) {
  return apiGet<PriceHistory>(`/markets/price-history/${conditionId}`, params);
}

/** 触发 AI 分析 */
export function triggerAnalysis(marketId: string) {
  return apiPost<AnalysisTask>(`/markets/${marketId}/analyze`);
}

/** 获取市场分析列表 */
export function fetchAnalyses(marketId: string) {
  return apiGet<{ analyses: AnalysisTask[] }>(`/markets/${marketId}/analyses`);
}

/** 获取分析详情 */
export function fetchAnalysisDetail(taskId: string) {
  return apiGet<AnalysisTask>(`/analysis/${taskId}`);
}

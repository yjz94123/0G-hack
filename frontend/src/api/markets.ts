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
  sortBy?: 'volume' | 'volume24h' | 'liquidity' | 'endDate' | 'createdAt';
  order?: 'asc' | 'desc';
  search?: string;
}) {
  return apiGet<EventSummary[]>('/markets', params);
}

/** 获取事件详情（含子市场） */
export function fetchEventDetail(eventId: string) {
  return apiGet<EventDetail>(`/markets/${eventId}`);
}

/** 获取订单簿 */
export function fetchOrderBook(
  eventId: string,
  marketId: string,
  params?: { depth?: number }
) {
  return apiGet<OrderBookData>(`/markets/${eventId}/orderbook/${marketId}`, params);
}

/** 获取价格历史 */
export function fetchPriceHistory(
  eventId: string,
  marketId: string,
  params?: { interval?: '1h' | '1d' | '1w' | 'max'; outcome?: 'yes' | 'no' }
) {
  return apiGet<PriceHistory>(`/markets/${eventId}/price-history/${marketId}`, params);
}

/** 触发 AI 分析 */
export function triggerAnalysis(
  eventId: string,
  marketId: string,
  body?: { question?: string }
) {
  return apiPost<AnalysisTask>(`/markets/${eventId}/analyze`, {
    marketId,
    ...(body ?? {}),
  });
}

/** 获取市场分析列表 */
export function fetchAnalyses(
  eventId: string,
  params?: { marketId?: string; status?: 'completed' | 'failed'; limit?: number; offset?: number }
) {
  return apiGet<AnalysisTask[]>(`/markets/${eventId}/analyses`, params);
}

/** 获取分析详情 */
export function fetchAnalysisDetail(taskId: string) {
  return apiGet<AnalysisTask>(`/analysis/${taskId}`);
}

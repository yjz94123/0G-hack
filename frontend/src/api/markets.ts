import { apiGet, apiPost } from './client';
import { mockApi, TEST_MODE } from './mockData';
import type {
  EventSummary,
  EventDetail,
  OrderBookData,
  PriceHistory,
  AnalysisTask,
  ApiResponse,
} from '@og-predict/shared';

/** 获取事件列表 */
export function fetchEvents(params?: {
  limit?: number;
  offset?: number;
  tag?: string;
  sortBy?: 'volume' | 'volume24h' | 'liquidity' | 'endDate' | 'createdAt';
  order?: 'asc' | 'desc';
  search?: string;
}): Promise<ApiResponse<EventSummary[]>> {
  if (TEST_MODE.enabled) {
    const data = mockApi.fetchEvents(params);
    return Promise.resolve({ success: true, data });
  }
  return apiGet<EventSummary[]>('/markets', params);
}

/** 获取事件详情（含子市场） */
export function fetchEventDetail(eventId: string): Promise<ApiResponse<EventDetail>> {
  if (TEST_MODE.enabled) {
    const data = mockApi.fetchEventDetail(eventId);
    if (!data) {
      return Promise.reject(new Error('Event not found'));
    }
    return Promise.resolve({ success: true, data });
  }
  return apiGet<EventDetail>(`/markets/${eventId}`);
}

/** 获取订单簿 */
export function fetchOrderBook(
  eventId: string,
  marketId: string,
  params?: { depth?: number }
): Promise<ApiResponse<OrderBookData>> {
  if (TEST_MODE.enabled) {
    const data = mockApi.fetchOrderBook(eventId, marketId);
    if (!data) {
      return Promise.reject(new Error('Market not found'));
    }
    return Promise.resolve({ success: true, data });
  }
  return apiGet<OrderBookData>(`/markets/${eventId}/orderbook/${marketId}`, params);
}

/** 获取价格历史 */
export function fetchPriceHistory(
  eventId: string,
  marketId: string,
  params?: { interval?: '1h' | '1d' | '1w' | 'max'; outcome?: 'yes' | 'no' }
): Promise<ApiResponse<PriceHistory>> {
  if (TEST_MODE.enabled) {
    const data = mockApi.fetchPriceHistory(eventId, marketId, params);
    if (!data) {
      return Promise.reject(new Error('Market not found'));
    }
    return Promise.resolve({ success: true, data });
  }
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

/** 导出测试模式控制 */
export { TEST_MODE };

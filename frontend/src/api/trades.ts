import { apiGet } from './client';
import type { TradeRecord } from '@og-predict/shared';

/** 获取用户交易记录 */
export function fetchUserTrades(userAddress: string, params?: {
  limit?: number;
  offset?: number;
}) {
  return apiGet<{ trades: TradeRecord[]; pagination: unknown }>(
    `/trades/${userAddress}`,
    params
  );
}

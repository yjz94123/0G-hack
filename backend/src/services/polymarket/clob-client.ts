import axios, { AxiosInstance } from 'axios';
import { POLYMARKET_CLOB_API } from '@og-predict/shared';
import { withRetry } from '../../utils/retry';
import { logger } from '../../utils/logger';

/**
 * Polymarket CLOB API 客户端
 * 负责获取订单簿、价格、交易数据
 * 注意速率限制: /book 接口 50次/10秒
 */
export class ClobClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: POLYMARKET_CLOB_API,
      timeout: 10_000,
    });
  }

  /** 获取订单簿 */
  async getOrderBook(tokenId: string) {
    return withRetry(async () => {
      const { data } = await this.client.get('/book', {
        params: { token_id: tokenId },
      });
      return data;
    });
  }

  /** 获取市场价格信息 */
  async getMarketPrice(tokenId: string) {
    return withRetry(async () => {
      const { data } = await this.client.get('/price', {
        params: { token_id: tokenId, side: 'buy' },
      });
      return data;
    });
  }

  /** 获取市场中间价 */
  async getMidpoint(tokenId: string) {
    return withRetry(async () => {
      const { data } = await this.client.get('/midpoint', {
        params: { token_id: tokenId },
      });
      return data;
    });
  }

  /** 获取市场信息（CLOB侧） */
  async getMarket(conditionId: string) {
    return withRetry(async () => {
      const { data } = await this.client.get(`/markets/${conditionId}`);
      return data;
    });
  }

  /** 批量获取市场价格 */
  async getMarketsPrices(tokenIds: string[]) {
    logger.debug({ count: tokenIds.length }, 'Fetching batch market prices');
    const results = await Promise.allSettled(
      tokenIds.map((id) => this.getMarketPrice(id))
    );
    return results.map((r, i) => ({
      tokenId: tokenIds[i],
      price: r.status === 'fulfilled' ? r.value : null,
      error: r.status === 'rejected' ? r.reason?.message : undefined,
    }));
  }
}

export const clobClient = new ClobClient();

import axios, { AxiosInstance } from 'axios';
import { POLYMARKET_GAMMA_API } from '@og-predict/shared';
import { withRetry } from '../../utils/retry';
import { logger } from '../../utils/logger';

/**
 * Polymarket Gamma API 客户端
 * 负责获取 events 和 markets 元数据
 */
export class GammaClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: POLYMARKET_GAMMA_API,
      timeout: 10_000,
    });
  }

  /** 获取活跃事件列表 */
  async getEvents(params: {
    limit?: number;
    offset?: number;
    active?: boolean;
    closed?: boolean;
    tag?: string;
    order?: string;
    ascending?: boolean;
  }) {
    return withRetry(async () => {
      const { data } = await this.client.get('/events', { params });
      return data;
    });
  }

  /** 获取单个事件详情 */
  async getEvent(eventId: string) {
    return withRetry(async () => {
      const { data } = await this.client.get(`/events/${eventId}`);
      return data;
    });
  }

  /** 获取市场列表 */
  async getMarkets(params: {
    limit?: number;
    offset?: number;
    active?: boolean;
    closed?: boolean;
    tag?: string;
  }) {
    return withRetry(async () => {
      const { data } = await this.client.get('/markets', { params });
      return data;
    });
  }

  /** 获取单个市场详情 */
  async getMarket(conditionId: string) {
    return withRetry(async () => {
      const { data } = await this.client.get(`/markets/${conditionId}`);
      return data;
    });
  }

  /** 按标签获取事件 */
  async getEventsByTag(tag: string, limit = 20) {
    logger.debug({ tag, limit }, 'Fetching events by tag');
    return this.getEvents({ tag, limit, active: true });
  }
}

export const gammaClient = new GammaClient();

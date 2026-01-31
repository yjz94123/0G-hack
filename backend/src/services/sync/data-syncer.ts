import { gammaClient } from '../polymarket';
import { logger } from '../../utils/logger';

/**
 * 数据同步服务
 * 定期从 Polymarket 拉取事件和市场数据，写入本地 DB
 */
export class DataSyncer {
  private isRunning = false;

  /** 全量同步事件和市场 */
  async syncAll(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Sync already in progress, skipping');
      return;
    }

    this.isRunning = true;
    try {
      logger.info('Starting full data sync...');
      await this.syncEvents();
      logger.info('Full data sync completed');
    } catch (err) {
      logger.error({ err }, 'Data sync failed');
      throw err;
    } finally {
      this.isRunning = false;
    }
  }

  /** 同步活跃事件 */
  private async syncEvents(): Promise<void> {
    const limit = 50;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const events = await gammaClient.getEvents({
        limit,
        offset,
        active: true,
      });

      if (!events || events.length === 0) {
        hasMore = false;
        break;
      }

      // TODO: Upsert events and their markets into DB via Prisma
      logger.info({ count: events.length, offset }, 'Synced events batch');

      offset += limit;
      if (events.length < limit) hasMore = false;
    }
  }
}

export const dataSyncer = new DataSyncer();

import { app } from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { dataSyncer, orderBookCache } from './services/sync';
import { marketMakerService } from './services/market-maker';

async function main() {
  // Start Express server
  app.listen(config.port, () => {
    logger.info(`Server running on http://localhost:${config.port}`);
    logger.info(`Environment: ${config.nodeEnv}`);
  });

  // Scheduled tasks (sync/caching)
  dataSyncer.start();

  setInterval(() => {
    orderBookCache.refreshHotMarkets().catch((err) => logger.error({ err }, 'OrderBook refresh failed'));
  }, config.sync.orderbookHotIntervalMs);

  setInterval(() => {
    orderBookCache.cleanup();
  }, Math.max(config.sync.orderbookColdIntervalMs, 60_000));

  // Market Maker Bot
  if (config.marketMaker.enabled) {
    marketMakerService.start();
  }

  logger.info('All services initialized');
}

main().catch((err) => {
  logger.error(err, 'Failed to start server');
  process.exit(1);
});

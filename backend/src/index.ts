import { app } from './app';
import { config } from './config';
import { logger } from './utils/logger';
// import { DataSyncer } from './services/sync/data-syncer';
// import { OracleService } from './services/oracle/oracle-service';
// import { SnapshotService } from './services/storage/snapshot-service';

async function main() {
  // Start Express server
  app.listen(config.port, () => {
    logger.info(`Server running on http://localhost:${config.port}`);
    logger.info(`Environment: ${config.nodeEnv}`);
  });

  // TODO: Initialize scheduled tasks
  // const dataSyncer = new DataSyncer();
  // const oracleService = new OracleService();
  // const snapshotService = new SnapshotService();

  // dataSyncer.start();
  // oracleService.start();
  // snapshotService.start();

  logger.info('All services initialized');
}

main().catch((err) => {
  logger.error(err, 'Failed to start server');
  process.exit(1);
});

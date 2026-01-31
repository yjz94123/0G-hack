import { Router } from 'express';

export const healthRouter = Router();

// GET /api/v1/health - 健康检查
healthRouter.get('/', async (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      version: process.env.npm_package_version || '0.1.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      services: {
        database: 'unknown',
        polymarket: 'unknown',
        ogStorage: 'unknown',
        ogCompute: 'unknown',
      },
    },
  });
});

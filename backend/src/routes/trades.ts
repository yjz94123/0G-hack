import { Router } from 'express';

export const tradesRouter = Router();

// GET /api/v1/trades/:userAddress - 查询用户交易记录
tradesRouter.get('/:userAddress', async (_req, res, next) => {
  try {
    // TODO: Query from DB + 0G KV Storage
    res.json({ success: true, data: { trades: [], pagination: null } });
  } catch (err) {
    next(err);
  }
});

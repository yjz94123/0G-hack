import { Router } from 'express';

export const analysisRouter = Router();

// GET /api/v1/analysis/:taskId - 查询AI分析结果
analysisRouter.get('/:taskId', async (_req, res, next) => {
  try {
    // TODO: Implement with DB query + 0G Storage fallback
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
});

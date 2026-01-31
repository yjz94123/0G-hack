import { v4 as uuidv4 } from 'uuid';
import { ogComputeClient } from './og-compute';
import { buildMarketAnalysisPrompt, SYSTEM_PROMPT } from './prompts';
import { ogKvClient } from '../storage';
import { logger } from '../../utils/logger';

export interface AnalysisRequest {
  marketId: string;
  question: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  liquidity: number;
  orderBookDepth: { bids: number; asks: number };
}

export interface AnalysisResult {
  taskId: string;
  marketId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: unknown;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

/**
 * AI 分析服务
 * 管理分析任务的创建、执行和结果存储
 */
export class AiService {
  /** 创建分析任务 */
  async createAnalysis(request: AnalysisRequest): Promise<AnalysisResult> {
    const taskId = uuidv4();
    const task: AnalysisResult = {
      taskId,
      marketId: request.marketId,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    // 存储任务状态到 DB
    // TODO: await prisma.analysisTask.create({ data: task });

    // 异步执行分析
    this.executeAnalysis(taskId, request).catch((err) => {
      logger.error({ err, taskId }, 'Analysis execution failed');
    });

    return task;
  }

  /** 执行分析（异步） */
  private async executeAnalysis(taskId: string, request: AnalysisRequest): Promise<void> {
    try {
      // TODO: Update status to 'processing' in DB

      const prompt = buildMarketAnalysisPrompt({
        question: request.question,
        yesPrice: request.yesPrice,
        noPrice: request.noPrice,
        volume: request.volume,
        liquidity: request.liquidity,
        orderBookDepth: request.orderBookDepth,
      });

      const response = await ogComputeClient.chatCompletion([
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ]);

      const result = JSON.parse(response);

      // TODO: Update task in DB with result and status='completed'

      // 持久化到 0G KV Storage
      await ogKvClient.putAnalysis(request.marketId, taskId, {
        taskId,
        marketId: request.marketId,
        result,
        completedAt: new Date().toISOString(),
      });

      logger.info({ taskId, marketId: request.marketId }, 'Analysis completed');
    } catch (err) {
      logger.error({ err, taskId }, 'Analysis failed');
      // TODO: Update task in DB with status='failed' and error message
    }
  }

  /** 查询分析结果 */
  async getAnalysis(taskId: string): Promise<AnalysisResult | null> {
    // TODO: Query from DB first, fallback to 0G KV
    return null;
  }

  /** 获取市场的所有分析 */
  async getMarketAnalyses(marketId: string): Promise<AnalysisResult[]> {
    // TODO: Query from DB
    return [];
  }
}

export const aiService = new AiService();

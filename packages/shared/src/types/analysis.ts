/** AI 分析论据 */
export interface AnalysisArgument {
  argument: string;
  confidence: number;
}

/** 分析任务状态 */
export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';

/** AI 分析任务 */
export interface AnalysisTask {
  taskId: string;
  marketId: string;
  status: AnalysisStatus;
  /** 结构化结果（通常来自提示词末尾 JSON） */
  result?: unknown;
  prediction?: 'YES' | 'NO';
  confidence?: number;
  proArguments?: AnalysisArgument[];
  conArguments?: AnalysisArgument[];
  reasoning?: string;
  ogStorageKey?: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
  updatedAt?: string;
}

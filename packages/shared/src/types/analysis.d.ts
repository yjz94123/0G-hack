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
//# sourceMappingURL=analysis.d.ts.map
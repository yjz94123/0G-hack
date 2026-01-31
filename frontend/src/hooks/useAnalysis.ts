import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { triggerAnalysis, fetchAnalyses, fetchAnalysisDetail } from '../api/markets';

/** 触发 AI 分析 */
export function useTriggerAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (marketId: string) => triggerAnalysis(marketId),
    onSuccess: (_data, marketId) => {
      queryClient.invalidateQueries({ queryKey: ['analyses', marketId] });
    },
  });
}

/** 获取市场分析列表 */
export function useAnalyses(marketId: string | undefined) {
  return useQuery({
    queryKey: ['analyses', marketId],
    queryFn: () => fetchAnalyses(marketId!),
    enabled: !!marketId,
  });
}

/** 获取分析详情（轮询直到完成） */
export function useAnalysisDetail(taskId: string | undefined) {
  return useQuery({
    queryKey: ['analysis', taskId],
    queryFn: () => fetchAnalysisDetail(taskId!),
    enabled: !!taskId,
    refetchInterval: (query) => {
      const status = query.state.data?.data?.status;
      if (status === 'completed' || status === 'failed') return false;
      return 3_000; // 每 3s 轮询一次
    },
  });
}

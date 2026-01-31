import { useQuery } from '@tanstack/react-query';
import { fetchPriceHistory } from '../api/markets';

/** 获取价格历史 */
export function usePriceHistory(conditionId: string | undefined, interval = '1h') {
  return useQuery({
    queryKey: ['priceHistory', conditionId, interval],
    queryFn: () => fetchPriceHistory(conditionId!, { interval }),
    enabled: !!conditionId,
  });
}

import { useQuery } from '@tanstack/react-query';
import { fetchOrderBook } from '../api/markets';

/** 获取订单簿（自动 30s 轮询） */
export function useOrderBook(tokenId: string | undefined) {
  return useQuery({
    queryKey: ['orderbook', tokenId],
    queryFn: () => fetchOrderBook(tokenId!),
    enabled: !!tokenId,
    refetchInterval: 30_000, // 30s 轮询
  });
}

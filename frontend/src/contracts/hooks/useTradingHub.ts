import { useReadContract, useWatchContractEvent } from 'wagmi';
import { formatUnits } from 'viem';
import { CONTRACTS, USDC_DECIMALS, OUTCOME } from '../config';
import { normalizeMarketIdBytes32 } from '../utils';
import { useEffect, useState } from 'react';

export interface Order {
  orderId: bigint;
  user: `0x${string}`;
  marketId: `0x${string}`;
  outcome: number;
  amount: bigint;
  timestamp: bigint;
  settled: boolean;
}

/**
 * Hook to get order details by ID
 */
export function useOrder(orderId?: number | bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACTS.TradingHub.address,
    abi: CONTRACTS.TradingHub.abi,
    functionName: 'getOrder',
    args: orderId !== undefined ? [BigInt(orderId)] : undefined,
    query: {
      enabled: orderId !== undefined,
    },
  });

  const order = data as Order | undefined;

  return {
    order: order ? {
      orderId: order.orderId,
      user: order.user,
      marketId: order.marketId,
      outcome: order.outcome,
      outcomeName: order.outcome === OUTCOME.YES ? 'YES' : 'NO',
      amount: formatUnits(order.amount, USDC_DECIMALS),
      amountRaw: order.amount,
      timestamp: Number(order.timestamp),
      settled: order.settled,
    } : undefined,
    orderRaw: order,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get all order IDs for a user
 */
export function useUserOrders(userAddress?: `0x${string}`) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACTS.TradingHub.address,
    abi: CONTRACTS.TradingHub.abi,
    functionName: 'getUserOrders',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
    },
  });

  return {
    orderIds: data as bigint[] | undefined,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get all order IDs for a market
 */
export function useMarketOrders(marketId?: string) {
  const marketIdBytes = normalizeMarketIdBytes32(marketId);

  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACTS.TradingHub.address,
    abi: CONTRACTS.TradingHub.abi,
    functionName: 'getMarketOrders',
    args: marketIdBytes ? [marketIdBytes] : undefined,
    query: {
      enabled: !!marketIdBytes,
    },
  });

  return {
    orderIds: data as bigint[] | undefined,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get user's orders for a specific market
 */
export function useUserMarketOrders(userAddress?: `0x${string}`, marketId?: string) {
  const marketIdBytes = normalizeMarketIdBytes32(marketId);

  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACTS.TradingHub.address,
    abi: CONTRACTS.TradingHub.abi,
    functionName: 'getUserMarketOrders',
    args: userAddress && marketIdBytes ? [userAddress, marketIdBytes] : undefined,
    query: {
      enabled: !!(userAddress && marketIdBytes),
    },
  });

  return {
    orderIds: data as bigint[] | undefined,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get total number of orders
 */
export function useTotalOrders() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACTS.TradingHub.address,
    abi: CONTRACTS.TradingHub.abi,
    functionName: 'totalOrders',
  });

  return {
    totalOrders: data ? Number(data) : 0,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to watch OrderPlaced events
 */
export function useWatchOrderPlaced(
  onOrderPlaced?: (data: {
    orderId: bigint;
    user: `0x${string}`;
    marketId: `0x${string}`;
    outcome: number;
    amount: bigint;
  }) => void
) {
  useWatchContractEvent({
    address: CONTRACTS.TradingHub.address,
    abi: CONTRACTS.TradingHub.abi,
    eventName: 'OrderPlaced',
    onLogs(logs) {
      logs.forEach((log: any) => {
        if (log.args && onOrderPlaced) {
          onOrderPlaced({
            orderId: log.args.orderId,
            user: log.args.user,
            marketId: log.args.marketId,
            outcome: log.args.outcome,
            amount: log.args.amount,
          });
        }
      });
    },
  });
}

/**
 * Hook to watch OrderSettled events
 */
export function useWatchOrderSettled(
  onOrderSettled?: (data: {
    orderId: bigint;
    user: `0x${string}`;
    marketId: `0x${string}`;
    won: boolean;
    payout: bigint;
  }) => void
) {
  useWatchContractEvent({
    address: CONTRACTS.TradingHub.address,
    abi: CONTRACTS.TradingHub.abi,
    eventName: 'OrderSettled',
    onLogs(logs) {
      logs.forEach((log: any) => {
        if (log.args && onOrderSettled) {
          onOrderSettled({
            orderId: log.args.orderId,
            user: log.args.user,
            marketId: log.args.marketId,
            won: log.args.won,
            payout: log.args.payout,
          });
        }
      });
    },
  });
}

/**
 * Hook to watch MarketSettled events
 */
export function useWatchMarketSettled(
  onMarketSettled?: (data: {
    marketId: `0x${string}`;
    winningOutcome: number;
    totalOrders: bigint;
  }) => void
) {
  useWatchContractEvent({
    address: CONTRACTS.TradingHub.address,
    abi: CONTRACTS.TradingHub.abi,
    eventName: 'MarketSettled',
    onLogs(logs) {
      logs.forEach((log: any) => {
        if (log.args && onMarketSettled) {
          onMarketSettled({
            marketId: log.args.marketId,
            winningOutcome: log.args.winningOutcome,
            totalOrders: log.args.totalOrders,
          });
        }
      });
    },
  });
}

/**
 * Combined hook to watch all TradingHub events
 */
export function useTradingHubEvents(callbacks?: {
  onOrderPlaced?: (data: any) => void;
  onOrderSettled?: (data: any) => void;
  onMarketSettled?: (data: any) => void;
}) {
  const [events, setEvents] = useState<any[]>([]);

  useWatchOrderPlaced((data) => {
    callbacks?.onOrderPlaced?.(data);
    setEvents((prev) => [...prev, { type: 'OrderPlaced', data, timestamp: Date.now() }]);
  });

  useWatchOrderSettled((data) => {
    callbacks?.onOrderSettled?.(data);
    setEvents((prev) => [...prev, { type: 'OrderSettled', data, timestamp: Date.now() }]);
  });

  useWatchMarketSettled((data) => {
    callbacks?.onMarketSettled?.(data);
    setEvents((prev) => [...prev, { type: 'MarketSettled', data, timestamp: Date.now() }]);
  });

  return { events };
}

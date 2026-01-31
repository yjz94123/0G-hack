import type { OrderBookData } from '@og-predict/shared';
import { Loading } from '../common';

interface OrderBookProps {
  data?: OrderBookData;
  isLoading: boolean;
}

export function OrderBook({ data, isLoading }: OrderBookProps) {
  if (isLoading) return <Loading size="sm" text="Loading order book..." />;
  if (!data) return null;

  const maxTotal = Math.max(
    ...data.bids.map((b) => b.total),
    ...data.asks.map((a) => a.total),
    1
  );

  return (
    <div className="bg-dark-900 rounded-xl border border-dark-800 p-4">
      <h3 className="text-sm font-medium text-dark-300 mb-3">Order Book</h3>

      <div className="grid grid-cols-2 gap-2 text-xs text-dark-500 mb-2">
        <div className="flex justify-between">
          <span>Price</span>
          <span>Size</span>
        </div>
        <div className="flex justify-between">
          <span>Price</span>
          <span>Size</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* Bids (Buy) */}
        <div className="space-y-0.5">
          {data.bids.slice(0, 10).map((bid, i) => (
            <div key={i} className="relative flex justify-between text-xs py-0.5 px-1">
              <div
                className="absolute inset-0 bg-green-500/10 rounded"
                style={{ width: `${(bid.total / maxTotal) * 100}%` }}
              />
              <span className="relative text-green-400">{bid.price.toFixed(2)}</span>
              <span className="relative text-dark-300">{bid.size.toFixed(0)}</span>
            </div>
          ))}
        </div>

        {/* Asks (Sell) */}
        <div className="space-y-0.5">
          {data.asks.slice(0, 10).map((ask, i) => (
            <div key={i} className="relative flex justify-between text-xs py-0.5 px-1">
              <div
                className="absolute inset-0 bg-red-500/10 rounded right-0"
                style={{ width: `${(ask.total / maxTotal) * 100}%` }}
              />
              <span className="relative text-red-400">{ask.price.toFixed(2)}</span>
              <span className="relative text-dark-300">{ask.size.toFixed(0)}</span>
            </div>
          ))}
        </div>
      </div>

      {data.spread !== undefined && (
        <div className="mt-2 text-center text-xs text-dark-500">
          Spread: {(data.spread * 100).toFixed(2)}%
        </div>
      )}
    </div>
  );
}

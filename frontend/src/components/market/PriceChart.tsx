import type { PriceHistory } from '@og-predict/shared';
import { Loading } from '../common';

interface PriceChartProps {
  data?: PriceHistory;
  isLoading: boolean;
}

export function PriceChart({ data, isLoading }: PriceChartProps) {
  if (isLoading) return <Loading size="sm" text="Loading chart..." />;
  if (!data || data.points.length === 0) return null;

  // TODO: Replace with lightweight-charts or recharts implementation
  const latest = data.points[data.points.length - 1];
  const first = data.points[0];
  const change = latest.yesPrice - first.yesPrice;
  const changePercent = (change / first.yesPrice) * 100;

  return (
    <div className="bg-dark-900 rounded-xl border border-dark-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-dark-300">Price History</h3>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-white font-medium">
            {(latest.yesPrice * 100).toFixed(1)}%
          </span>
          <span className={change >= 0 ? 'text-green-400' : 'text-red-400'}>
            {change >= 0 ? '+' : ''}{changePercent.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Placeholder for chart - will be replaced with actual chart library */}
      <div className="h-48 flex items-center justify-center text-dark-600 text-sm">
        Chart placeholder - {data.points.length} data points
      </div>
    </div>
  );
}

import { useParams } from 'react-router-dom';
import { useEventDetail, useOrderBook, usePriceHistory } from '../hooks';
import { OrderBook, PriceChart } from '../components/market';
import { TradePanel } from '../components/trade';
import { AnalysisPanel } from '../components/ai';
import { Loading, ErrorMessage } from '../components/common';

export function MarketDetailPage() {
  const { marketId } = useParams<{ marketId: string }>();
  const { data: eventData, isLoading, error } = useEventDetail(marketId);
  const event = eventData?.data;
  const market = event?.markets?.[0];

  const { data: orderBookData, isLoading: obLoading } = useOrderBook(
    market?.clobTokenIds?.[0]
  );
  const { data: priceData, isLoading: priceLoading } = usePriceHistory(
    market?.conditionId
  );

  if (isLoading) return <Loading text="Loading market..." />;
  if (error) return <ErrorMessage message={error.message} />;
  if (!event) return <ErrorMessage message="Market not found" />;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">{event.title}</h1>
        {event.description && (
          <p className="text-dark-400 mt-2 text-sm">{event.description}</p>
        )}
        <div className="mt-3 flex items-center gap-4 text-sm text-dark-500">
          <span>Volume: ${((event.volume || 0) / 1e6).toFixed(1)}M</span>
          <span>Liquidity: ${((event.liquidity || 0) / 1e6).toFixed(1)}M</span>
          {event.endDate && <span>Ends: {new Date(event.endDate).toLocaleDateString()}</span>}
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: chart + order book */}
        <div className="lg:col-span-2 space-y-6">
          <PriceChart data={priceData?.data} isLoading={priceLoading} />
          <OrderBook data={orderBookData?.data} isLoading={obLoading} />
        </div>

        {/* Right column: trade + AI */}
        <div className="space-y-6">
          {market && (
            <TradePanel
              marketId={market.conditionId}
              yesPrice={market.yesPrice}
              noPrice={market.noPrice}
            />
          )}
          {market && <AnalysisPanel marketId={market.conditionId} />}
        </div>
      </div>
    </div>
  );
}

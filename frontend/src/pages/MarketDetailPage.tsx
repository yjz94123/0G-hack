import { useParams, Link } from 'react-router-dom';
import { useEventDetail, useOrderBook, usePriceHistory } from '../hooks';
import { OrderBook, PriceChart } from '../components/market';
import { TradePanel } from '../components/trade';
import { AnalysisPanel } from '../components/ai';
import { Loading, ErrorMessage } from '../components/common';
import { ChevronLeft, Clock, BarChart2, Info } from 'lucide-react';

import { useTranslation } from 'react-i18next';

export function MarketDetailPage() {
  const { t } = useTranslation();
  const { marketId } = useParams<{ marketId: string }>();
  // TODO: The API currently expects an eventId for useEventDetail, but routing uses marketId. 
  // Ideally we should resolve eventId from marketId or have a market-specific hook.
  // For now assuming marketId is the eventId for the demo.
  const { data: eventData, isLoading, error } = useEventDetail(marketId);
  const event = eventData?.data;
  const market = event?.markets?.[0]; // Default to first market

  const { data: orderBookData, isLoading: obLoading } = useOrderBook(
    market?.clobTokenIds?.[0]
  );
  const { data: priceData, isLoading: priceLoading } = usePriceHistory(
    market?.conditionId
  );

  if (isLoading) return <Loading text={t('common.loading')} />;
  if (error) return <ErrorMessage message={error.message || t('common.error')} />;
  if (!event) return <ErrorMessage message={t('marketDetail.marketUnavailable')} />;

  const volume = event.volume || 0;
  const liquidity = event.liquidity || 0;
  
  const formatMoney = (val: number) => {
    if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
    if (val >= 1e3) return `$${(val / 1e3).toFixed(1)}k`;
    return `$${val.toLocaleString()}`;
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-2 mb-6 text-sm text-dark-400">
        <Link to="/" className="hover:text-white flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" />
          Markets
        </Link>
        <span>/</span>
        <span className="text-white truncate max-w-[200px]">{event.title}</span>
      </div>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8 border-b border-dark-800 pb-8">
        <div className="flex-1">
          <div className="flex items-start gap-4">
             {event.imageUrl && (
                <img 
                  src={event.imageUrl} 
                  alt={event.title} 
                  className="w-16 h-16 rounded-lg object-cover bg-dark-800"
                />
             )}
             <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">{event.title}</h1>
                 <div className="flex flex-wrap items-center gap-6 text-sm">
                    <div className="flex items-center gap-2 text-dark-300">
                       <Clock className="w-4 h-4" />
                       <span>{t('marketDetail.expires')} {new Date(event.endDate).toLocaleDateString()}</span>
                    </div>
                </div>
             </div>
          </div>
        </div>
        
        <div className="flex gap-4">
           {/* Rules Button */}
           <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-800 text-white hover:bg-dark-700 transition border border-dark-700">
              <Info className="w-4 h-4" />
              <span>{t('marketDetail.rules')}</span>
           </button>
        </div>
      </div>
      
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
         <div className="bg-dark-900/50 rounded-lg p-3 border border-dark-800">
            <div className="text-xs text-dark-500 mb-1">{t('marketDetail.volume')}</div>
            <div className="text-lg font-medium text-white">{formatMoney(volume)}</div>
         </div>
         <div className="bg-dark-900/50 rounded-lg p-3 border border-dark-800">
            <div className="text-xs text-dark-500 mb-1">{t('marketDetail.liquidity')}</div>
            <div className="text-lg font-medium text-white">{formatMoney(liquidity)}</div>
         </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (Chart, OrderBook) - 8 cols */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-dark-900 rounded-xl border border-dark-800 p-1 min-h-[400px]">
             {/* Chart Header */}
             <div className="flex items-center justify-between p-4 border-b border-dark-800/50">
                <div className="flex items-center gap-2">
                   <BarChart2 className="w-4 h-4 text-dark-400" />
                   <span className="text-sm font-medium text-white">{t('marketDetail.priceHistory')}</span>
                </div>
             </div>
             
             <div className="p-4">
                <PriceChart data={priceData?.data} isLoading={priceLoading} />
             </div>
          </div>
          
           <div className="bg-dark-900 rounded-xl border border-dark-800 p-1">
               <div className="p-4 border-b border-dark-800/50">
                  <h3 className="text-sm font-medium text-white">Order Book</h3>
               </div>
               <div className="p-4">
                 <OrderBook data={orderBookData?.data} isLoading={obLoading} />
               </div>
           </div>
        </div>

        {/* Right Column (Trade, AI) - 4 cols */}
        <div className="lg:col-span-4 space-y-6">
          <div className="sticky top-24 space-y-6">
             {market ? (
                <TradePanel
                  marketId={market.conditionId}
                  yesPrice={parseFloat(market.outcomePrices?.[1] || '0')}
                  noPrice={parseFloat(market.outcomePrices?.[0] || '0')}
                />
              ) : (
                <div className="bg-dark-900 rounded-xl border border-dark-800 p-8 text-center text-dark-500">
                   {t('marketDetail.marketUnavailable')}
                </div>
              )}
              
              {market && <AnalysisPanel marketId={market.conditionId} />}
          </div>
        </div>
      </div>
    </div>
  );
}

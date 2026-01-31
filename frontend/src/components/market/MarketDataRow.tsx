import { Link } from 'react-router-dom';
import type { EventSummary } from '@og-predict/shared';
import { clsx } from 'clsx';

interface MarketDataRowProps {
  event: EventSummary;
}

import { useTranslation } from 'react-i18next';

export function MarketDataRow({ event }: MarketDataRowProps) {
  const { t } = useTranslation();
  // Safe helpers for possibly undefined values
  const volume = event.volume || 0;
  const liquidity = event.liquidity || 0;
  const marketsCount = event.markets ? event.markets.length : 0;
  
  // Format numbers for clean display
  const formatMoney = (val: number) => {
    if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
    if (val >= 1e3) return `$${(val / 1e3).toFixed(1)}k`;
    return `$${val.toLocaleString()}`;
  };

  const isEndingSoon = new Date(event.endDate).getTime() - Date.now() < 86400000; // 24h

  return (
    <div className="group relative">
      <Link 
        to={`/market/${event.eventId}`}
        className="grid grid-cols-12 gap-4 items-center p-4 rounded-lg hover:bg-dark-900 transition-colors border-b border-dark-800/50 hover:border-transparent"
      >
        {/* Market Title & Icon */}
        <div className="col-span-12 md:col-span-6 flex gap-4">
          <div className="flex-shrink-0">
            {event.imageUrl ? (
              <img 
                src={event.imageUrl} 
                alt={event.title} 
                className="w-10 h-10 rounded-full object-cover bg-dark-800"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-dark-800 flex items-center justify-center text-dark-500">
                ?
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-white font-medium truncate pr-4 group-hover:text-primary-400 transition-colors">
              {event.title}
            </h3>
            <div className="flex items-center gap-3 mt-1 text-xs text-dark-400">
              {isEndingSoon && (
                <span className="text-orange-400 flex items-center gap-1">
                  {t('marketList.expiresSoon')}
                </span>
              )}
              <span>{new Date(event.endDate).toLocaleDateString()}</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline truncate">{event.description}</span>
            </div>
          </div>
        </div>

        {/* 24h Volume */}
        <div className="col-span-4 md:col-span-2 text-right hidden md:block">
          <div className="text-white font-medium">{formatMoney(event.volume24h)}</div>
          <div className="text-dark-500 text-xs mt-0.5">{t('marketList.vol24h')}</div>
        </div>

        {/* Total Volume */}
        <div className="col-span-4 md:col-span-2 text-right">
          <div className="text-white font-medium">{formatMoney(volume)}</div>
          <div className="text-dark-500 text-xs mt-0.5 md:hidden">{t('marketList.totalVol')}</div>
        </div>

        {/* Liquidity */}
        <div className="col-span-4 md:col-span-2 text-right hidden sm:block">
          <div className="text-white font-medium">{formatMoney(liquidity)}</div>
          <div className="text-dark-500 text-xs mt-0.5 md:hidden">{t('marketList.liquidity')}</div>
        </div>
      </Link>
      
      {/* Mobile-only markets count badge */}
        <div className="absolute top-4 right-4 md:hidden">
            <span className="px-2 py-0.5 bg-dark-800 text-dark-300 text-[10px] rounded border border-dark-700">
                {marketsCount} mkts
            </span>
        </div>
    </div>
  );
}

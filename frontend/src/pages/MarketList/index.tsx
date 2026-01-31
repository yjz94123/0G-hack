import React, { useState } from 'react';
import { useMarketStore } from '../../stores/market-store';
import { MarketDataRow } from '../../components/market/MarketDataRow';
import { Loading } from '../../components/common';
import { Search, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { clsx } from 'clsx';

// Mock data for initial render if store is empty
// In a real app, this would be fetched via React Query
import type { EventSummary } from '@og-predict/shared';

import { useTranslation } from 'react-i18next';

const MarketList: React.FC = () => {
  const { t } = useTranslation();
  const { events, isLoading } = useMarketStore();
  const [filter, setFilter] = useState<'trending' | 'new' | 'ending'>('trending');
  
  // Categories based on the screenshot
  const categories = ['All', 'Politics', 'Crypto', 'Finance', 'Geopolitics', 'Tech', 'World'];
  const [activeCategory, setActiveCategory] = useState('All');

  return (
    <div className="space-y-6">
      {/* Filters Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center border-b border-dark-800 pb-4">
        {/* Left: View Filters */}
        <div className="flex items-center gap-6 w-full md:w-auto overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setFilter('trending')}
            className={clsx(
              "flex items-center gap-2 text-sm font-medium whitespace-nowrap pb-2 md:pb-0 border-b-2 md:border-b-0 transition-colors",
               filter === 'trending' ? "text-white border-white" : "text-dark-400 border-transparent hover:text-white"
            )}
          >
            <ArrowUpDown className="w-4 h-4" />
            {t('marketList.trending')}
          </button>
          <button 
             onClick={() => setFilter('new')}
             className={clsx(
              "flex items-center gap-2 text-sm font-medium whitespace-nowrap pb-2 md:pb-0 border-b-2 md:border-b-0 transition-colors",
               filter === 'new' ? "text-white border-white" : "text-dark-400 border-transparent hover:text-white"
            )}
          >
            {t('marketList.newEvents')}
          </button>
          <button 
             onClick={() => setFilter('ending')}
             className={clsx(
              "flex items-center gap-2 text-sm font-medium whitespace-nowrap pb-2 md:pb-0 border-b-2 md:border-b-0 transition-colors",
               filter === 'ending' ? "text-white border-white" : "text-dark-400 border-transparent hover:text-white"
            )}
          >
            {t('marketList.endingSoon')}
          </button>
          
          <div className="h-4 w-px bg-dark-700 hidden md:block mx-2" />
          
          {/* Categories */}
          <div className="flex items-center gap-4">
             {categories.map(cat => (
                <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={clsx(
                        "text-sm transition-colors whitespace-nowrap",
                        activeCategory === cat ? "text-white font-medium" : "text-dark-400 hover:text-white"
                    )}
                >
                    {cat}
                </button>
             ))}
          </div>
        </div>

        {/* Right: Search */}
        <div className="w-full md:w-auto relative">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
           <input 
              type="text"
              placeholder={t('common.search')}
              className="w-full md:w-64 bg-dark-900 border border-dark-800 rounded-lg py-2 pl-9 pr-4 text-sm text-white placeholder:text-dark-500 focus:outline-none focus:border-dark-600 transition-colors"
           />
        </div>
      </div>

      {/* Main Content */}
      <div className="min-h-[500px]">
        {/* Table Header (Hidden on Mobile) */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-4 pb-2 text-xs font-medium text-dark-500 uppercase tracking-wider">
           <div className="col-span-6">{t('marketList.event')}</div>
           <div className="col-span-2 text-right">{t('marketList.vol24h')}</div>
           <div className="col-span-2 text-right">{t('marketList.totalVol')}</div>
           <div className="col-span-2 text-right">{t('marketList.liquidity')}</div>
        </div>

        {isLoading ? (
           <Loading size="lg" text={t('common.loading')} />
        ) : events.length === 0 ? (
           // Placeholder for when no events are loaded yet
           <div className="text-center py-20">
              <div className="w-16 h-16 bg-dark-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-dark-500" />
              </div>
              <h3 className="text-white font-medium mb-2">{t('marketList.noMarkets')}</h3>
              <p className="text-dark-500 text-sm">{t('marketList.noMarketsDesc')}</p>
           </div>
        ) : (
           <div className="space-y-1">
              {events.map((event: EventSummary) => (
                  <MarketDataRow key={event.eventId} event={event} />
              ))}
           </div>
        )}
      </div>
    </div>
  );
};

export default MarketList;

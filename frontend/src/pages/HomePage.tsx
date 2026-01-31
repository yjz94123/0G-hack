import { useState } from 'react';
import { useEvents } from '../hooks';
import { EventList } from '../components/market';

const TAGS = ['All', 'Politics', 'Crypto', 'Sports', 'Science', 'Culture'];

export function HomePage() {
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const { data, isLoading, error, refetch } = useEvents({
    limit: 20,
    tag: selectedTag === 'All' ? undefined : selectedTag.toLowerCase(),
  });

  const events = data?.data?.events || [];

  return (
    <div>
      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Prediction Markets</h1>
        <p className="text-dark-400 mt-1">
          Aggregated from Polymarket. Powered by 0G Network.
        </p>
      </div>

      {/* Tag filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(tag)}
            className={`px-4 py-1.5 text-sm rounded-full whitespace-nowrap transition ${
              selectedTag === tag
                ? 'bg-primary-600 text-white'
                : 'bg-dark-800 text-dark-400 hover:text-white'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Event list */}
      <EventList
        events={events}
        isLoading={isLoading}
        error={error}
        onRetry={() => refetch()}
      />
    </div>
  );
}

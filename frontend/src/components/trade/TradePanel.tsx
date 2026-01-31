import { useState } from 'react';
import { useWalletStore } from '../../stores';

interface TradePanelProps {
  marketId: string;
  yesPrice: number;
  noPrice: number;
}

export function TradePanel({ marketId: _marketId, yesPrice, noPrice }: TradePanelProps) {
  const { isConnected } = useWalletStore();
  const [side, setSide] = useState<'yes' | 'no'>('yes');
  const [amount, setAmount] = useState('');

  const currentPrice = side === 'yes' ? yesPrice : noPrice;
  const shares = amount ? parseFloat(amount) / currentPrice : 0;

  const handleTrade = async () => {
    if (!isConnected || !amount) return;
    // TODO: Call smart contract via ethers
  };

  return (
    <div className="bg-surface rounded-xl border border-border p-4">
      <h3 className="text-sm font-medium text-fg-primary mb-3">Trade</h3>

      {/* Side selector */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={() => setSide('yes')}
          className={`py-2 rounded-lg text-sm font-medium transition ${
            side === 'yes'
              ? 'bg-green-600 text-white'
              : 'bg-elevated text-fg-secondary hover:text-fg-primary'
          }`}
        >
          Yes {(yesPrice * 100).toFixed(0)}c
        </button>
        <button
          onClick={() => setSide('no')}
          className={`py-2 rounded-lg text-sm font-medium transition ${
            side === 'no'
              ? 'bg-red-600 text-white'
              : 'bg-elevated text-fg-secondary hover:text-fg-primary'
          }`}
        >
          No {(noPrice * 100).toFixed(0)}c
        </button>
      </div>

      {/* Amount input */}
      <div className="mb-3">
        <label className="text-xs text-fg-muted mb-1 block">Amount (USDC)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full bg-elevated border border-border-strong rounded-lg px-3 py-2 text-fg-primary text-sm focus:outline-none focus:border-primary-500"
        />
      </div>

      {/* Estimated shares */}
      {shares > 0 && (
        <div className="mb-4 text-xs text-fg-secondary">
          Est. shares: {shares.toFixed(2)} @ {(currentPrice * 100).toFixed(0)}c
        </div>
      )}

      {/* Trade button */}
      {isConnected ? (
        <button
          onClick={handleTrade}
          disabled={!amount || parseFloat(amount) <= 0}
          className="w-full py-2.5 rounded-lg bg-primary-600 text-white font-medium text-sm hover:bg-primary-500 disabled:opacity-50 transition"
        >
          Buy {side === 'yes' ? 'Yes' : 'No'}
        </button>
      ) : (
        <p className="text-center text-sm text-fg-muted">Connect wallet to trade</p>
      )}
    </div>
  );
}

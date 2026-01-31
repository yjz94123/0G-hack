import { useWalletStore } from '../../stores';

export function ConnectButton() {
  const { isConnected, isConnecting, connect, disconnect } = useWalletStore();

  if (isConnected) {
    return (
      <button
        onClick={disconnect}
        className="px-4 py-2 text-sm rounded-lg border border-border-strong text-fg-secondary hover:text-fg-primary hover:border-border transition"
      >
        Disconnect
      </button>
    );
  }

  return (
    <button
      onClick={connect}
      disabled={isConnecting}
      className="px-4 py-2 text-sm rounded-lg bg-primary-600 text-white hover:bg-primary-500 disabled:opacity-50 transition"
    >
      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
}

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import { defineChain } from 'viem';

export const zeroGTestnet = defineChain({
  id: 16600, // Replace with actual 0G testnet Chain ID if different. 16600 is often cited for 0G Newton.
  name: '0G Newton Testnet',
  network: '0g-newton',
  nativeCurrency: {
    decimals: 18,
    name: 'A0GI',
    symbol: 'A0GI',
  },
  rpcUrls: {
    default: { http: ['https://rpc-testnet.0g.ai'] }, // Replace with actual RPC
    public: { http: ['https://rpc-testnet.0g.ai'] },
  },
  blockExplorers: {
    default: { name: '0G Explorer', url: 'https://scan-testnet.0g.ai' },
  },
  testnet: true,
});

export const config = getDefaultConfig({
  appName: '0G Prediction Market',
  projectId: 'YOUR_PROJECT_ID', // Replaced with a placeholder, user should update
  chains: [zeroGTestnet],
  transports: {
    [zeroGTestnet.id]: http(),
  },
});

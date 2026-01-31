import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import { defineChain } from 'viem';

export const zeroGTestnet = defineChain({
  id: 16602, // 0G Newton Testnet Chain ID
  name: '0G Newton Testnet',
  network: '0g-newton',
  nativeCurrency: {
    decimals: 18,
    name: 'A0GI',
    symbol: 'A0GI',
  },
  rpcUrls: {
    default: { http: ['https://rpc.ankr.com/0g_galileo_testnet_evm'] },
    public: { http: ['https://rpc.ankr.com/0g_galileo_testnet_evm'] },
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

import { ethers } from 'ethers';
import { logger } from '../../utils/logger';
import { config } from '../../config';

// TODO: Import ABI from compiled contracts
const TRADING_HUB_ABI: string[] = [];

/**
 * TradingHub 合约交互客户端
 * 负责与链上 TradingHub (ERC1155 + Order Book) 合约交互
 */
export class TradingHubClient {
  private provider: ethers.JsonRpcProvider | null = null;
  private contract: ethers.Contract | null = null;

  constructor() {
    if (config.zeroG.evmRpc && config.contracts.tradingHub) {
      this.provider = new ethers.JsonRpcProvider(config.zeroG.evmRpc);
      this.contract = new ethers.Contract(
        config.contracts.tradingHub,
        TRADING_HUB_ABI,
        this.provider
      );
    }
  }

  /** 获取签名者（用于写操作） */
  private getSigner(): ethers.Wallet {
    if (!this.provider || !config.oracle.privateKey) {
      throw new Error('Provider or private key not configured');
    }
    return new ethers.Wallet(config.oracle.privateKey, this.provider);
  }

  /** 查询市场信息 */
  async getMarket(marketId: string): Promise<unknown> {
    if (!this.contract) throw new Error('Contract not initialized');
    // TODO: return this.contract.markets(marketId);
    logger.debug({ marketId }, 'Getting market from contract');
    return null;
  }

  /** 结算市场（Oracle 调用） */
  async resolveMarket(marketId: string, outcome: number): Promise<string> {
    const signer = this.getSigner();
    const contractWithSigner = this.contract!.connect(signer) as ethers.Contract;

    logger.info({ marketId, outcome }, 'Resolving market on-chain');
    // TODO: const tx = await contractWithSigner.resolveMarket(marketId, outcome);
    // TODO: const receipt = await tx.wait();
    // TODO: return receipt.hash;
    return 'placeholder-tx-hash';
  }

  /** 监听合约事件 */
  async listenToEvents(): Promise<void> {
    if (!this.contract) return;

    // TODO: Listen for OrderPlaced, OrderFilled, MarketResolved events
    // this.contract.on('OrderPlaced', (marketId, user, side, amount, price) => { ... });
    // this.contract.on('MarketResolved', (marketId, outcome) => { ... });
    logger.info('Listening to TradingHub contract events');
  }
}

export const tradingHubClient = new TradingHubClient();

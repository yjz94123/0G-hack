import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import { config } from '../../config';
import { tradingHubClient } from '../contract/trading-hub';
import { clobClient } from '../polymarket';
import { polymarketToOnchainMarketId } from '../../utils/id-mapping';

const USDC_DECIMALS = 6;
const USDC_UNIT = BigInt(10 ** USDC_DECIMALS);

const OUTCOME_YES = 1;
const OUTCOME_NO = 0;
const SIDE_BUY = 0;

const prisma = new PrismaClient();

/**
 * Market Maker Bot 服务
 *
 * 从 Polymarket 读取实时价格，自动在 TradingHub 合约上挂双边订单，
 * 为 0G 测试网的链上订单簿提供流动性。
 *
 * 定价策略:
 *   buyYesPrice = midPricePct - spread
 *   buyNoPrice  = (100 - midPricePct) - spread
 *   → 两价之和 = 100 - 2*spread < 100, 永远不会自我撮合
 */
export class MarketMakerService {
  private wallet: ethers.Wallet | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private activeOrderIds: Map<string, bigint[]> = new Map(); // onchainMarketId → orderIds

  constructor() {
    if (config.marketMaker.privateKey) {
      const provider = tradingHubClient.getProvider();
      this.wallet = new ethers.Wallet(config.marketMaker.privateKey, provider);
    }
  }

  /** 获取做市商钱包地址 */
  get address(): string {
    if (!this.wallet) throw new Error('Market maker wallet not configured');
    return this.wallet.address;
  }

  /** 启动做市服务 */
  start(): void {
    if (!config.marketMaker.enabled) {
      logger.info('Market maker is disabled');
      return;
    }
    if (!this.wallet) {
      logger.error('Market maker private key not configured, cannot start');
      return;
    }

    logger.info(
      { address: this.address, interval: config.marketMaker.intervalMs },
      'Starting Market Maker service',
    );

    // 立即执行一次
    this.runCycle().catch((err) => logger.error({ err }, 'Market maker initial cycle failed'));

    // 定时执行
    this.timer = setInterval(() => {
      this.runCycle().catch((err) => logger.error({ err }, 'Market maker cycle failed'));
    }, config.marketMaker.intervalMs);
  }

  /** 停止做市服务 */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    logger.info('Market Maker service stopped');
  }

  /** 单个做市周期 */
  private async runCycle(): Promise<void> {
    if (this.isRunning) {
      logger.debug('Market maker cycle already running, skipping');
      return;
    }

    this.isRunning = true;
    try {
      logger.info('Market maker cycle starting');

      // 1. 确保链上余额充足
      await this.ensureBalance();

      // 2. 取消上个周期的所有订单
      await this.cancelAllOrders();

      // 3. 从 DB 获取活跃市场
      const markets = await this.selectMarkets();
      if (markets.length === 0) {
        logger.info('No active markets found for market making');
        return;
      }

      // 4. 对每个市场挂单
      for (const market of markets) {
        try {
          await this.quoteMarket(market);
        } catch (err) {
          logger.error({ err, marketId: market.conditionId }, 'Failed to quote market');
        }
      }

      logger.info({ marketCount: markets.length }, 'Market maker cycle completed');
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 确保做市商在合约中有足够余额
   * 不足时自动 mint → approve → deposit
   */
  private async ensureBalance(): Promise<void> {
    if (!this.wallet) return;

    const minBalance = BigInt(config.marketMaker.minBalanceUsdc) * USDC_UNIT;
    const mintAmount = BigInt(config.marketMaker.mintAmountUsdc) * USDC_UNIT;

    try {
      const balance = await tradingHubClient.getUserBalance(this.address);
      logger.debug({ balance: balance.toString(), min: minBalance.toString() }, 'MM balance check');

      if (balance >= minBalance) return;

      logger.info({ balance: balance.toString() }, 'MM balance low, replenishing...');

      // Step 1: Mint DemoUSDC
      try {
        await tradingHubClient.mintUsdc(this.address, mintAmount, this.wallet);
        logger.info({ amount: mintAmount.toString() }, 'Minted DemoUSDC for MM');
      } catch (err: any) {
        // MintCooldownActive 错误说明冷却未结束，跳过
        if (err?.message?.includes('MintCooldown') || err?.reason?.includes('MintCooldown')) {
          logger.debug('Mint cooldown active, skipping mint');
        } else {
          throw err;
        }
      }

      // Step 2: Approve TradingHub (如果 allowance 不够)
      const allowance = await tradingHubClient.getUsdcAllowance(
        this.address,
        config.contracts.tradingHubAddress,
      );
      if (allowance < mintAmount) {
        await tradingHubClient.approveUsdc(
          config.contracts.tradingHubAddress,
          ethers.MaxUint256,
          this.wallet,
        );
        logger.info('Approved TradingHub for DemoUSDC');
      }

      // Step 3: Deposit 所有 USDC 余额
      const usdcBalance = await tradingHubClient.getUsdcBalance(this.address);
      if (usdcBalance > 0n) {
        await tradingHubClient.deposit(usdcBalance, this.wallet);
        logger.info({ amount: usdcBalance.toString() }, 'Deposited USDC to TradingHub');
      }
    } catch (err) {
      logger.error({ err }, 'Failed to ensure MM balance');
    }
  }

  /** 取消上个周期遗留的所有活跃订单 */
  private async cancelAllOrders(): Promise<void> {
    if (!this.wallet) return;

    for (const [marketId, orderIds] of this.activeOrderIds.entries()) {
      for (const orderId of orderIds) {
        try {
          await tradingHubClient.cancelOrder(Number(orderId), this.wallet);
          logger.debug({ orderId: orderId.toString(), marketId }, 'Cancelled MM order');
        } catch (err: any) {
          // OrderNotActive 说明已被撮合或已取消，正常忽略
          if (err?.message?.includes('OrderNotActive') || err?.reason?.includes('OrderNotActive')) {
            logger.debug({ orderId: orderId.toString() }, 'Order already inactive, skipping cancel');
          } else {
            logger.error({ err, orderId: orderId.toString() }, 'Failed to cancel MM order');
          }
        }
      }
    }
    this.activeOrderIds.clear();
  }

  /** 从 DB 选取活跃市场（按 volume 降序，取 top N） */
  private async selectMarkets() {
    const markets = await prisma.market.findMany({
      where: {
        active: true,
        closed: false,
        acceptingOrders: true,
        clobTokenIds: { isEmpty: false },
      },
      orderBy: { volume: 'desc' },
      take: config.marketMaker.maxMarkets,
      select: {
        id: true,
        conditionId: true,
        clobTokenIds: true,
        onchainMarketId: true,
        outcomePrices: true,
      },
    });

    return markets;
  }

  /** 对单个市场报价并挂单 */
  private async quoteMarket(market: {
    id: string;
    conditionId: string;
    clobTokenIds: string[];
    onchainMarketId: string | null;
    outcomePrices: string[];
  }): Promise<void> {
    if (!this.wallet) return;

    // clobTokenIds[0] = YES token, clobTokenIds[1] = NO token (Polymarket convention)
    const yesTokenId = market.clobTokenIds[0];
    if (!yesTokenId) {
      logger.debug({ marketId: market.conditionId }, 'No YES token ID, skipping');
      return;
    }

    // 获取 Polymarket 中间价
    let midPrice: number;
    try {
      const midpointData = await clobClient.getMidpoint(yesTokenId);
      midPrice = parseFloat(midpointData?.mid ?? midpointData?.price ?? '0');
      if (midPrice <= 0 || midPrice >= 1) {
        // 尝试使用 outcomePrices
        midPrice = parseFloat(market.outcomePrices[0] || '0');
      }
    } catch {
      // 降级使用 DB 中的价格
      midPrice = parseFloat(market.outcomePrices[0] || '0');
    }

    if (midPrice <= 0 || midPrice >= 1) {
      logger.debug({ marketId: market.conditionId, midPrice }, 'Invalid mid price, skipping');
      return;
    }

    const spreadPercent = config.marketMaker.spreadBps / 100;
    const midPricePct = Math.round(midPrice * 100);

    // 计算双边价格
    const buyYesPrice = midPricePct - spreadPercent;
    const buyNoPrice = (100 - midPricePct) - spreadPercent;

    // 价格边界检查
    if (buyYesPrice < 1 || buyYesPrice > 99 || buyNoPrice < 1 || buyNoPrice > 99) {
      logger.debug(
        { marketId: market.conditionId, midPricePct, buyYesPrice, buyNoPrice },
        'Prices out of range after spread, skipping',
      );
      return;
    }

    // 链上 marketId
    const onchainMarketId = market.onchainMarketId || polymarketToOnchainMarketId(market.conditionId);
    const orderAmount = BigInt(config.marketMaker.orderAmountUsdc) * USDC_UNIT;
    const placedOrderIds: bigint[] = [];

    // 挂 BUY YES 订单
    try {
      const receipt = await tradingHubClient.placeOrder(
        onchainMarketId,
        OUTCOME_YES,
        SIDE_BUY,
        buyYesPrice,
        orderAmount,
        this.wallet,
      );
      const orderId = tradingHubClient.extractOrderId(receipt);
      if (orderId !== null) placedOrderIds.push(orderId);
      logger.info(
        { market: market.conditionId, side: 'BUY YES', price: buyYesPrice, amount: config.marketMaker.orderAmountUsdc },
        'Placed MM order',
      );
    } catch (err) {
      logger.error({ err, market: market.conditionId, side: 'BUY YES' }, 'Failed to place MM order');
    }

    // 挂 BUY NO 订单
    try {
      const receipt = await tradingHubClient.placeOrder(
        onchainMarketId,
        OUTCOME_NO,
        SIDE_BUY,
        buyNoPrice,
        orderAmount,
        this.wallet,
      );
      const orderId = tradingHubClient.extractOrderId(receipt);
      if (orderId !== null) placedOrderIds.push(orderId);
      logger.info(
        { market: market.conditionId, side: 'BUY NO', price: buyNoPrice, amount: config.marketMaker.orderAmountUsdc },
        'Placed MM order',
      );
    } catch (err) {
      logger.error({ err, market: market.conditionId, side: 'BUY NO' }, 'Failed to place MM order');
    }

    if (placedOrderIds.length > 0) {
      this.activeOrderIds.set(onchainMarketId, placedOrderIds);
    }
  }
}

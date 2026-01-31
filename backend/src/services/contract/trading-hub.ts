import { ethers } from 'ethers';
import { logger } from '../../utils/logger';
import { config } from '../../config';

const TRADING_HUB_ABI = [
  // Write functions
  'function deposit(uint256 amount) external',
  'function withdraw(uint256 amount) external',
  'function placeOrder(bytes32 marketId, uint8 outcome, uint8 side, uint256 price, uint256 amount) external returns (uint256)',
  'function cancelOrder(uint256 orderId) external',
  'function resolveMarket(bytes32 marketId, uint8 winningOutcome) external',
  'function redeem(bytes32 marketId) external',
  // Read functions
  'function userBalances(address) external view returns (uint256)',
  'function lockedBalances(address) external view returns (uint256)',
  'function orders(uint256) external view returns (uint256 id, address owner, bytes32 marketId, uint8 outcome, uint8 side, uint256 price, uint256 amount, uint256 timestamp, bool isActive)',
  'function getTokenId(bytes32 marketId, uint8 outcome) external pure returns (uint256)',
  'function balanceOf(address account, uint256 id) external view returns (uint256)',
  'function getUserOrderIds(address user) external view returns (uint256[])',
  'function getUserActiveOrders(address user) external view returns (tuple(uint256 id, address owner, bytes32 marketId, uint8 outcome, uint8 side, uint256 price, uint256 amount, uint256 timestamp, bool isActive)[])',
  'function getMarketStatus(bytes32 marketId) external view returns (uint8, uint8, uint256)',
  'function getOrderBookSnapshot(bytes32 marketId, uint8 outcome) external view returns (uint256[], uint256[], uint256[], uint256[])',
  'function marketTotalLocked(bytes32) external view returns (uint256)',
  // Events
  'event Deposit(address indexed user, uint256 amount)',
  'event Withdraw(address indexed user, uint256 amount)',
  'event OrderPlaced(uint256 indexed orderId, address indexed owner, bytes32 indexed marketId, uint8 outcome, uint8 side, uint256 price, uint256 amount)',
  'event OrderCancelled(uint256 indexed orderId, address indexed owner)',
  'event OrderMatched(bytes32 indexed marketId, uint256 buyOrderId, uint256 sellOrderId, uint256 price, uint256 amount, address buyer, address seller)',
  'event MarketResolved(bytes32 indexed marketId, uint8 winningOutcome, uint256 timestamp)',
  'event Redemption(address indexed user, bytes32 indexed marketId, uint256 tokenAmount, uint256 usdcAmount)',
];

const DEMO_USDC_ABI = [
  'function mint(address to, uint256 amount) external',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)',
];

/**
 * TradingHub 合约交互客户端
 * 负责与链上 TradingHub (ERC1155 + Order Book) 合约交互
 */
export class TradingHubClient {
  private provider: ethers.JsonRpcProvider | null = null;

  constructor() {
    if (config.og.rpcUrl) {
      this.provider = new ethers.JsonRpcProvider(config.og.rpcUrl);
    }
  }

  /** 获取 provider */
  getProvider(): ethers.JsonRpcProvider {
    if (!this.provider) throw new Error('Provider not configured');
    return this.provider;
  }

  /** 获取 TradingHub 合约（支持自定义 signer） */
  getContract(signer?: ethers.Signer): ethers.Contract {
    const signerOrProvider = signer || this.getProvider();
    return new ethers.Contract(
      config.contracts.tradingHubAddress,
      TRADING_HUB_ABI,
      signerOrProvider,
    );
  }

  /** 获取 DemoUSDC 合约（支持自定义 signer） */
  getUsdcContract(signer?: ethers.Signer): ethers.Contract {
    const signerOrProvider = signer || this.getProvider();
    return new ethers.Contract(
      config.contracts.demoUsdcAddress,
      DEMO_USDC_ABI,
      signerOrProvider,
    );
  }

  /** 获取 Oracle 签名者 */
  getOracleSigner(): ethers.Wallet {
    if (!config.oracle.privateKey) throw new Error('Oracle private key not configured');
    return new ethers.Wallet(config.oracle.privateKey, this.getProvider());
  }

  // ============================================================
  //                    TradingHub Read Methods
  // ============================================================

  async getUserBalance(userAddress: string): Promise<bigint> {
    const contract = this.getContract();
    return contract.userBalances(userAddress);
  }

  async getLockedBalance(userAddress: string): Promise<bigint> {
    const contract = this.getContract();
    return contract.lockedBalances(userAddress);
  }

  async getUserActiveOrders(userAddress: string): Promise<unknown[]> {
    const contract = this.getContract();
    return contract.getUserActiveOrders(userAddress);
  }

  async getMarketStatus(marketId: string): Promise<{ status: number; winner: number; resolvedAt: bigint }> {
    const contract = this.getContract();
    const [status, winner, resolvedAt] = await contract.getMarketStatus(marketId);
    return { status, winner, resolvedAt };
  }

  async getOrderBookSnapshot(marketId: string, outcome: number) {
    const contract = this.getContract();
    const [bidPrices, bidAmounts, askPrices, askAmounts] = await contract.getOrderBookSnapshot(marketId, outcome);
    return { bidPrices, bidAmounts, askPrices, askAmounts };
  }

  // ============================================================
  //                    TradingHub Write Methods
  // ============================================================

  async deposit(amount: bigint, signer: ethers.Signer): Promise<ethers.ContractTransactionReceipt> {
    const contract = this.getContract(signer);
    const tx = await contract.deposit(amount);
    return tx.wait();
  }

  async withdraw(amount: bigint, signer: ethers.Signer): Promise<ethers.ContractTransactionReceipt> {
    const contract = this.getContract(signer);
    const tx = await contract.withdraw(amount);
    return tx.wait();
  }

  async placeOrder(
    marketId: string,
    outcome: number,
    side: number,
    price: number,
    amount: bigint,
    signer: ethers.Signer,
  ): Promise<ethers.ContractTransactionReceipt> {
    const contract = this.getContract(signer);
    const tx = await contract.placeOrder(marketId, outcome, side, price, amount);
    return tx.wait();
  }

  async cancelOrder(orderId: number, signer: ethers.Signer): Promise<ethers.ContractTransactionReceipt> {
    const contract = this.getContract(signer);
    const tx = await contract.cancelOrder(orderId);
    return tx.wait();
  }

  async resolveMarket(marketId: string, outcome: number): Promise<string> {
    const signer = this.getOracleSigner();
    const contract = this.getContract(signer);
    logger.info({ marketId, outcome }, 'Resolving market on-chain');
    const tx = await contract.resolveMarket(marketId, outcome);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async redeem(marketId: string, signer: ethers.Signer): Promise<ethers.ContractTransactionReceipt> {
    const contract = this.getContract(signer);
    const tx = await contract.redeem(marketId);
    return tx.wait();
  }

  // ============================================================
  //                     DemoUSDC Methods
  // ============================================================

  async mintUsdc(to: string, amount: bigint, signer: ethers.Signer): Promise<ethers.ContractTransactionReceipt> {
    const usdc = this.getUsdcContract(signer);
    const tx = await usdc.mint(to, amount);
    return tx.wait();
  }

  async approveUsdc(spender: string, amount: bigint, signer: ethers.Signer): Promise<ethers.ContractTransactionReceipt> {
    const usdc = this.getUsdcContract(signer);
    const tx = await usdc.approve(spender, amount);
    return tx.wait();
  }

  async getUsdcBalance(account: string): Promise<bigint> {
    const usdc = this.getUsdcContract();
    return usdc.balanceOf(account);
  }

  async getUsdcAllowance(owner: string, spender: string): Promise<bigint> {
    const usdc = this.getUsdcContract();
    return usdc.allowance(owner, spender);
  }

  // ============================================================
  //                     Event Parsing Helpers
  // ============================================================

  /** 从交易 receipt 中解析 OrderPlaced 事件，提取 orderId */
  extractOrderId(receipt: ethers.ContractTransactionReceipt): bigint | null {
    const iface = new ethers.Interface(TRADING_HUB_ABI);
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
        if (parsed && parsed.name === 'OrderPlaced') {
          return parsed.args[0] as bigint; // orderId
        }
      } catch {
        // not our event, skip
      }
    }
    return null;
  }

  /** 监听合约事件 */
  async listenToEvents(): Promise<void> {
    const contract = this.getContract();
    logger.info('Listening to TradingHub contract events');
    // TODO: implement event listeners as needed
  }
}

export const tradingHubClient = new TradingHubClient();

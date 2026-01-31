import type {
  EventSummary,
  EventDetail,
  OrderBookData,
  PriceHistory,
  MarketSummary,
  MarketDetail,
} from '@og-predict/shared';

// 生成逼真的价格历史数据（K线）
function generatePriceHistory(
  marketId: string,
  outcome: string,
  interval: string,
  basePrice: number,
  volatility: number = 0.05
): PriceHistory {
  const now = Date.now();
  const points: { timestamp: number; price: number }[] = [];

  let intervals: number;
  let step: number;

  switch (interval) {
    case '1h':
      intervals = 24;
      step = 60 * 60 * 1000; // 1小时
      break;
    case '1d':
      intervals = 30;
      step = 24 * 60 * 60 * 1000; // 1天
      break;
    case '1w':
      intervals = 12;
      step = 7 * 24 * 60 * 60 * 1000; // 1周
      break;
    default: // max
      intervals = 90;
      step = 24 * 60 * 60 * 1000;
  }

  let currentPrice = basePrice;

  for (let i = intervals; i >= 0; i--) {
    const timestamp = now - i * step;
    // 添加随机波动，模拟真实市场
    const change = (Math.random() - 0.5) * 2 * volatility;
    currentPrice = Math.max(0.01, Math.min(0.99, currentPrice + change));
    points.push({
      timestamp,
      price: Math.round(currentPrice * 1000) / 1000,
    });
  }

  return {
    marketId,
    outcome,
    interval,
    history: points,
  };
}

// 生成订单簿数据
function generateOrderBook(yesPrice: number): OrderBookData {
  const noPrice = 1 - yesPrice;

  const generateSide = (basePrice: number, isYes: boolean) => {
    const bids = [];
    const asks = [];

    // 生成买单
    for (let i = 0; i < 5; i++) {
      const bidPrice = Math.max(0.01, basePrice - 0.01 * (i + 1));
      bids.push({
        price: bidPrice.toFixed(2),
        size: (Math.random() * 5000 + 500).toFixed(0),
      });
    }

    // 生成卖单
    for (let i = 0; i < 5; i++) {
      const askPrice = Math.min(0.99, basePrice + 0.01 * (i + 1));
      asks.push({
        price: askPrice.toFixed(2),
        size: (Math.random() * 5000 + 500).toFixed(0),
      });
    }

    const bestBid = bids[0]?.price || '0';
    const bestAsk = asks[0]?.price || '1';
    const spread = (parseFloat(bestAsk) - parseFloat(bestBid)).toFixed(2);
    const midpoint = ((parseFloat(bestAsk) + parseFloat(bestBid)) / 2).toFixed(3);

    return { bids, asks, bestBid, bestAsk, spread, midpoint };
  };

  return {
    yes: generateSide(yesPrice, true),
    no: generateSide(noPrice, false),
    hash: `0x${Math.random().toString(16).slice(2, 66)}`,
    timestamp: new Date().toISOString(),
  };
}

// 20条看起来真实的测试数据
const mockEventsData: EventDetail[] = [
  {
    eventId: 'evt-001',
    slug: 'bitcoin-100k-2025',
    title: 'Bitcoin将在2025年Q2前突破$100,000',
    description:
      'Bitcoin (BTC) 是否会在2025年6月30日前达到或超过$100,000美元？这个市场将基于Coinbase、Binance和Kraken的平均价格来结算。',
    imageUrl: '₿',
    iconUrl: '🪙',
    startDate: '2024-12-01T00:00:00Z',
    endDate: '2025-06-30T23:59:59Z',
    active: true,
    closed: false,
    featured: true,
    volume: 8547320,
    volume24h: 234567,
    liquidity: 1250000,
    openInterest: 3420000,
    tags: [
      { slug: 'crypto', label: '加密货币' },
      { slug: 'bitcoin', label: 'Bitcoin' },
    ],
    resolutionSource: 'CoinGecko API',
    markets: [
      {
        marketId: 'mkt-001-yes',
        conditionId: 'cond-001',
        question: 'Bitcoin将在2025年Q2前突破$100,000吗？',
        outcomes: ['Yes', 'No'],
        outcomePrices: ['0.67', '0.33'],
        lastTradePrice: '0.67',
        bestBid: '0.66',
        bestAsk: '0.68',
        spread: 0.02,
        volume: '8547320',
        onchainMarketId: '1',
        clobTokenIds: ['token-001-yes', 'token-001-no'],
        resolutionStatus: 0,
        acceptingOrders: true,
        polymarketOrderBook: generateOrderBook(0.67),
      },
    ],
    syncedAt: new Date().toISOString(),
  },
  {
    eventId: 'evt-002',
    slug: 'trump-2025-approval-60',
    title: 'Trump支持率在2025年3月超过60%',
    description:
      '根据FiveThirtyEight的民调平均值，Donald Trump的支持率是否会在2025年3月31日前超过60%？',
    imageUrl: '🗳️',
    iconUrl: '🏛️',
    startDate: '2025-01-20T00:00:00Z',
    endDate: '2025-03-31T23:59:59Z',
    active: true,
    closed: false,
    featured: true,
    volume: 5234890,
    volume24h: 189234,
    liquidity: 890000,
    openInterest: 2150000,
    tags: [
      { slug: 'politics', label: '政治' },
      { slug: 'usa', label: '美国' },
    ],
    resolutionSource: 'FiveThirtyEight',
    markets: [
      {
        marketId: 'mkt-002-yes',
        conditionId: 'cond-002',
        question: 'Trump支持率将超过60%吗？',
        outcomes: ['Yes', 'No'],
        outcomePrices: ['0.42', '0.58'],
        lastTradePrice: '0.42',
        bestBid: '0.41',
        bestAsk: '0.43',
        spread: 0.02,
        volume: '5234890',
        onchainMarketId: '2',
        clobTokenIds: ['token-002-yes', 'token-002-no'],
        resolutionStatus: 0,
        acceptingOrders: true,
        polymarketOrderBook: generateOrderBook(0.42),
      },
    ],
    syncedAt: new Date().toISOString(),
  },
  {
    eventId: 'evt-003',
    slug: 'ethereum-etf-approval-q1',
    title: 'Ethereum现货ETF在2025年Q1获批',
    description:
      '美国SEC是否会在2025年3月31日前批准至少一只Ethereum现货ETF？基于SEC官方公告结算。',
    imageUrl: '⟠',
    iconUrl: '💎',
    startDate: '2024-11-15T00:00:00Z',
    endDate: '2025-03-31T23:59:59Z',
    active: true,
    closed: false,
    featured: true,
    volume: 12340000,
    volume24h: 456789,
    liquidity: 2100000,
    openInterest: 5600000,
    tags: [
      { slug: 'crypto', label: '加密货币' },
      { slug: 'ethereum', label: 'Ethereum' },
      { slug: 'regulation', label: '监管' },
    ],
    resolutionSource: 'SEC Official',
    markets: [
      {
        marketId: 'mkt-003-yes',
        conditionId: 'cond-003',
        question: 'Ethereum现货ETF将获批吗？',
        outcomes: ['Yes', 'No'],
        outcomePrices: ['0.78', '0.22'],
        lastTradePrice: '0.78',
        bestBid: '0.77',
        bestAsk: '0.79',
        spread: 0.02,
        volume: '12340000',
        onchainMarketId: '3',
        clobTokenIds: ['token-003-yes', 'token-003-no'],
        resolutionStatus: 0,
        acceptingOrders: true,
        polymarketOrderBook: generateOrderBook(0.78),
      },
    ],
    syncedAt: new Date().toISOString(),
  },
  {
    eventId: 'evt-004',
    slug: 'super-bowl-2025-chiefs',
    title: 'Kansas City Chiefs赢得Super Bowl LIX',
    description:
      'Kansas City Chiefs是否会赢得2025年2月9日举行的Super Bowl LIX？基于NFL官方结果结算。',
    imageUrl: '🏈',
    iconUrl: '🏆',
    startDate: '2024-09-01T00:00:00Z',
    endDate: '2025-02-09T23:59:59Z',
    active: true,
    closed: false,
    featured: true,
    volume: 6789000,
    volume24h: 312456,
    liquidity: 1450000,
    openInterest: 2890000,
    tags: [
      { slug: 'sports', label: '体育' },
      { slug: 'nfl', label: 'NFL' },
    ],
    resolutionSource: 'NFL Official',
    markets: [
      {
        marketId: 'mkt-004-yes',
        conditionId: 'cond-004',
        question: 'Chiefs将赢得Super Bowl LIX吗？',
        outcomes: ['Yes', 'No'],
        outcomePrices: ['0.23', '0.77'],
        lastTradePrice: '0.23',
        bestBid: '0.22',
        bestAsk: '0.24',
        spread: 0.02,
        volume: '6789000',
        onchainMarketId: '4',
        clobTokenIds: ['token-004-yes', 'token-004-no'],
        resolutionStatus: 0,
        acceptingOrders: true,
        polymarketOrderBook: generateOrderBook(0.23),
      },
    ],
    syncedAt: new Date().toISOString(),
  },
  {
    eventId: 'evt-005',
    slug: 'fed-rate-cut-march-2025',
    title: '美联储在2025年3月降息',
    description:
      '美联储是否会在2025年3月FOMC会议上宣布降息？基于联邦公开市场委员会官方声明结算。',
    imageUrl: '💵',
    iconUrl: '🏦',
    startDate: '2025-01-01T00:00:00Z',
    endDate: '2025-03-20T23:59:59Z',
    active: true,
    closed: false,
    featured: false,
    volume: 4567890,
    volume24h: 178900,
    liquidity: 890000,
    openInterest: 1890000,
    tags: [
      { slug: 'economics', label: '经济' },
      { slug: 'fed', label: '美联储' },
    ],
    resolutionSource: 'Federal Reserve',
    markets: [
      {
        marketId: 'mkt-005-yes',
        conditionId: 'cond-005',
        question: '美联储将在3月降息吗？',
        outcomes: ['Yes', 'No'],
        outcomePrices: ['0.55', '0.45'],
        lastTradePrice: '0.55',
        bestBid: '0.54',
        bestAsk: '0.56',
        spread: 0.02,
        volume: '4567890',
        onchainMarketId: '5',
        clobTokenIds: ['token-005-yes', 'token-005-no'],
        resolutionStatus: 0,
        acceptingOrders: true,
        polymarketOrderBook: generateOrderBook(0.55),
      },
    ],
    syncedAt: new Date().toISOString(),
  },
  {
    eventId: 'evt-006',
    slug: 'openai-gpt5-release-2025',
    title: 'OpenAI在2025年上半年发布GPT-5',
    description:
      'OpenAI是否会在2025年6月30日前公开发布GPT-5？必须是官方发布的产品，而非内部测试版本。',
    imageUrl: '🤖',
    iconUrl: '🧠',
    startDate: '2024-12-01T00:00:00Z',
    endDate: '2025-06-30T23:59:59Z',
    active: true,
    closed: false,
    featured: true,
    volume: 3456780,
    volume24h: 123456,
    liquidity: 670000,
    openInterest: 1450000,
    tags: [
      { slug: 'tech', label: '科技' },
      { slug: 'ai', label: 'AI' },
    ],
    resolutionSource: 'OpenAI Official Blog',
    markets: [
      {
        marketId: 'mkt-006-yes',
        conditionId: 'cond-006',
        question: 'GPT-5将在2025年H1发布吗？',
        outcomes: ['Yes', 'No'],
        outcomePrices: ['0.35', '0.65'],
        lastTradePrice: '0.35',
        bestBid: '0.34',
        bestAsk: '0.36',
        spread: 0.02,
        volume: '3456780',
        onchainMarketId: '6',
        clobTokenIds: ['token-006-yes', 'token-006-no'],
        resolutionStatus: 0,
        acceptingOrders: true,
        polymarketOrderBook: generateOrderBook(0.35),
      },
    ],
    syncedAt: new Date().toISOString(),
  },
  {
    eventId: 'evt-007',
    slug: 'solana-flip-ethereum-mcap',
    title: 'Solana市值超越Ethereum',
    description:
      'Solana (SOL) 的总市值是否会在2025年底前超过Ethereum (ETH)？基于CoinGecko数据。',
    imageUrl: '☀️',
    iconUrl: '⚡',
    startDate: '2025-01-01T00:00:00Z',
    endDate: '2025-12-31T23:59:59Z',
    active: true,
    closed: false,
    featured: false,
    volume: 2345670,
    volume24h: 89012,
    liquidity: 450000,
    openInterest: 980000,
    tags: [
      { slug: 'crypto', label: '加密货币' },
      { slug: 'solana', label: 'Solana' },
    ],
    resolutionSource: 'CoinGecko',
    markets: [
      {
        marketId: 'mkt-007-yes',
        conditionId: 'cond-007',
        question: 'Solana市值将超过ETH吗？',
        outcomes: ['Yes', 'No'],
        outcomePrices: ['0.12', '0.88'],
        lastTradePrice: '0.12',
        bestBid: '0.11',
        bestAsk: '0.13',
        spread: 0.02,
        volume: '2345670',
        onchainMarketId: '7',
        clobTokenIds: ['token-007-yes', 'token-007-no'],
        resolutionStatus: 0,
        acceptingOrders: true,
        polymarketOrderBook: generateOrderBook(0.12),
      },
    ],
    syncedAt: new Date().toISOString(),
  },
  {
    eventId: 'evt-008',
    slug: 'tesla-fsd-level4-2025',
    title: 'Tesla实现Level 4自动驾驶',
    description:
      'Tesla是否会在2025年底前获得任何州的Level 4自动驾驶许可证？基于官方监管批准文件。',
    imageUrl: '🚗',
    iconUrl: '⚡',
    startDate: '2025-01-01T00:00:00Z',
    endDate: '2025-12-31T23:59:59Z',
    active: true,
    closed: false,
    featured: false,
    volume: 1890000,
    volume24h: 67890,
    liquidity: 340000,
    openInterest: 720000,
    tags: [
      { slug: 'tech', label: '科技' },
      { slug: 'automotive', label: '汽车' },
    ],
    resolutionSource: 'NHTSA/DMV',
    markets: [
      {
        marketId: 'mkt-008-yes',
        conditionId: 'cond-008',
        question: 'Tesla将获得L4许可吗？',
        outcomes: ['Yes', 'No'],
        outcomePrices: ['0.18', '0.82'],
        lastTradePrice: '0.18',
        bestBid: '0.17',
        bestAsk: '0.19',
        spread: 0.02,
        volume: '1890000',
        onchainMarketId: '8',
        clobTokenIds: ['token-008-yes', 'token-008-no'],
        resolutionStatus: 0,
        acceptingOrders: true,
        polymarketOrderBook: generateOrderBook(0.18),
      },
    ],
    syncedAt: new Date().toISOString(),
  },
  {
    eventId: 'evt-009',
    slug: 'china-taiwan-military-action',
    title: '中国大陆对台采取军事行动',
    description:
      '中国大陆是否会在2025年底前对台湾采取重大军事行动（包括封锁、导弹袭击或登陆）？',
    imageUrl: '🌏',
    iconUrl: '⚔️',
    startDate: '2025-01-01T00:00:00Z',
    endDate: '2025-12-31T23:59:59Z',
    active: true,
    closed: false,
    featured: true,
    volume: 7890000,
    volume24h: 234567,
    liquidity: 1560000,
    openInterest: 3200000,
    tags: [
      { slug: 'geopolitics', label: '地缘政治' },
      { slug: 'asia', label: '亚洲' },
    ],
    resolutionSource: 'Reuters/AP',
    markets: [
      {
        marketId: 'mkt-009-yes',
        conditionId: 'cond-009',
        question: '中国大陆将对台采取军事行动吗？',
        outcomes: ['Yes', 'No'],
        outcomePrices: ['0.08', '0.92'],
        lastTradePrice: '0.08',
        bestBid: '0.07',
        bestAsk: '0.09',
        spread: 0.02,
        volume: '7890000',
        onchainMarketId: '9',
        clobTokenIds: ['token-009-yes', 'token-009-no'],
        resolutionStatus: 0,
        acceptingOrders: true,
        polymarketOrderBook: generateOrderBook(0.08),
      },
    ],
    syncedAt: new Date().toISOString(),
  },
  {
    eventId: 'evt-010',
    slug: 'apple-vision-pro-sales-1m',
    title: 'Apple Vision Pro销量突破100万',
    description:
      'Apple Vision Pro的累计销量是否会在2025年底前突破100万台？基于Apple官方或可靠分析师报告。',
    imageUrl: '🥽',
    iconUrl: '🍎',
    startDate: '2024-06-01T00:00:00Z',
    endDate: '2025-12-31T23:59:59Z',
    active: true,
    closed: false,
    featured: false,
    volume: 1234560,
    volume24h: 45678,
    liquidity: 280000,
    openInterest: 520000,
    tags: [
      { slug: 'tech', label: '科技' },
      { slug: 'apple', label: 'Apple' },
    ],
    resolutionSource: 'Apple/IDC',
    markets: [
      {
        marketId: 'mkt-010-yes',
        conditionId: 'cond-010',
        question: 'Vision Pro销量将突破100万吗？',
        outcomes: ['Yes', 'No'],
        outcomePrices: ['0.28', '0.72'],
        lastTradePrice: '0.28',
        bestBid: '0.27',
        bestAsk: '0.29',
        spread: 0.02,
        volume: '1234560',
        onchainMarketId: '10',
        clobTokenIds: ['token-010-yes', 'token-010-no'],
        resolutionStatus: 0,
        acceptingOrders: true,
        polymarketOrderBook: generateOrderBook(0.28),
      },
    ],
    syncedAt: new Date().toISOString(),
  },
  {
    eventId: 'evt-011',
    slug: 'nvidia-stock-200-2025',
    title: 'NVIDIA股价在2025年突破$200',
    description:
      'NVIDIA (NVDA) 股价是否会在2025年底前收盘价突破$200？基于纳斯达克官方收盘价。',
    imageUrl: '📈',
    iconUrl: '💹',
    startDate: '2025-01-01T00:00:00Z',
    endDate: '2025-12-31T23:59:59Z',
    active: true,
    closed: false,
    featured: true,
    volume: 5678900,
    volume24h: 198765,
    liquidity: 1120000,
    openInterest: 2340000,
    tags: [
      { slug: 'stocks', label: '股票' },
      { slug: 'tech', label: '科技' },
    ],
    resolutionSource: 'NASDAQ',
    markets: [
      {
        marketId: 'mkt-011-yes',
        conditionId: 'cond-011',
        question: 'NVDA将突破$200吗？',
        outcomes: ['Yes', 'No'],
        outcomePrices: ['0.62', '0.38'],
        lastTradePrice: '0.62',
        bestBid: '0.61',
        bestAsk: '0.63',
        spread: 0.02,
        volume: '5678900',
        onchainMarketId: '11',
        clobTokenIds: ['token-011-yes', 'token-011-no'],
        resolutionStatus: 0,
        acceptingOrders: true,
        polymarketOrderBook: generateOrderBook(0.62),
      },
    ],
    syncedAt: new Date().toISOString(),
  },
  {
    eventId: 'evt-012',
    slug: 'ufc-300-jon-jones-win',
    title: 'Jon Jones在UFC 300卫冕',
    description:
      'Jon Jones是否会在UFC 300成功卫冕重量级冠军？基于UFC官方比赛结果。',
    imageUrl: '🥊',
    iconUrl: '👊',
    startDate: '2025-01-15T00:00:00Z',
    endDate: '2025-04-15T23:59:59Z',
    active: true,
    closed: false,
    featured: false,
    volume: 2345000,
    volume24h: 87654,
    liquidity: 450000,
    openInterest: 920000,
    tags: [
      { slug: 'sports', label: '体育' },
      { slug: 'mma', label: 'MMA' },
    ],
    resolutionSource: 'UFC Official',
    markets: [
      {
        marketId: 'mkt-012-yes',
        conditionId: 'cond-012',
        question: 'Jon Jones将卫冕吗？',
        outcomes: ['Yes', 'No'],
        outcomePrices: ['0.71', '0.29'],
        lastTradePrice: '0.71',
        bestBid: '0.70',
        bestAsk: '0.72',
        spread: 0.02,
        volume: '2345000',
        onchainMarketId: '12',
        clobTokenIds: ['token-012-yes', 'token-012-no'],
        resolutionStatus: 0,
        acceptingOrders: true,
        polymarketOrderBook: generateOrderBook(0.71),
      },
    ],
    syncedAt: new Date().toISOString(),
  },
  {
    eventId: 'evt-013',
    slug: 'spacex-starship-mars-2025',
    title: 'SpaceX Starship在2025年发射火星任务',
    description:
      'SpaceX是否会在2025年底前使用Starship执行火星任务（包括货运任务）？基于SpaceX官方确认。',
    imageUrl: '🚀',
    iconUrl: '🔴',
    startDate: '2025-01-01T00:00:00Z',
    endDate: '2025-12-31T23:59:59Z',
    active: true,
    closed: false,
    featured: false,
    volume: 890000,
    volume24h: 34567,
    liquidity: 180000,
    openInterest: 380000,
    tags: [
      { slug: 'tech', label: '科技' },
      { slug: 'space', label: '航天' },
    ],
    resolutionSource: 'SpaceX Official',
    markets: [
      {
        marketId: 'mkt-013-yes',
        conditionId: 'cond-013',
        question: 'Starship将执行火星任务吗？',
        outcomes: ['Yes', 'No'],
        outcomePrices: ['0.05', '0.95'],
        lastTradePrice: '0.05',
        bestBid: '0.04',
        bestAsk: '0.06',
        spread: 0.02,
        volume: '890000',
        onchainMarketId: '13',
        clobTokenIds: ['token-013-yes', 'token-013-no'],
        resolutionStatus: 0,
        acceptingOrders: true,
        polymarketOrderBook: generateOrderBook(0.05),
      },
    ],
    syncedAt: new Date().toISOString(),
  },
  {
    eventId: 'evt-014',
    slug: 'ukraine-war-ceasefire-2025',
    title: '俄乌战争在2025年实现停火',
    description:
      '俄罗斯与乌克兰是否会在2025年底前达成正式停火协议？基于双方官方声明或联合国确认。',
    imageUrl: '🕊️',
    iconUrl: '🇺🇦',
    startDate: '2025-01-01T00:00:00Z',
    endDate: '2025-12-31T23:59:59Z',
    active: true,
    closed: false,
    featured: true,
    volume: 9870000,
    volume24h: 345678,
    liquidity: 1980000,
    openInterest: 4120000,
    tags: [
      { slug: 'geopolitics', label: '地缘政治' },
      { slug: 'europe', label: '欧洲' },
    ],
    resolutionSource: 'UN/Reuters',
    markets: [
      {
        marketId: 'mkt-014-yes',
        conditionId: 'cond-014',
        question: '俄乌将达成停火吗？',
        outcomes: ['Yes', 'No'],
        outcomePrices: ['0.38', '0.62'],
        lastTradePrice: '0.38',
        bestBid: '0.37',
        bestAsk: '0.39',
        spread: 0.02,
        volume: '9870000',
        onchainMarketId: '14',
        clobTokenIds: ['token-014-yes', 'token-014-no'],
        resolutionStatus: 0,
        acceptingOrders: true,
        polymarketOrderBook: generateOrderBook(0.38),
      },
    ],
    syncedAt: new Date().toISOString(),
  },
  {
    eventId: 'evt-015',
    slug: 'dogecoin-1-dollar-2025',
    title: 'Dogecoin在2025年达到$1',
    description:
      'Dogecoin (DOGE) 是否会在2025年底前达到$1美元？基于CoinGecko平均价格。',
    imageUrl: '🐕',
    iconUrl: '🌙',
    startDate: '2025-01-01T00:00:00Z',
    endDate: '2025-12-31T23:59:59Z',
    active: true,
    closed: false,
    featured: false,
    volume: 4560000,
    volume24h: 167890,
    liquidity: 890000,
    openInterest: 1870000,
    tags: [
      { slug: 'crypto', label: '加密货币' },
      { slug: 'meme', label: 'Meme币' },
    ],
    resolutionSource: 'CoinGecko',
    markets: [
      {
        marketId: 'mkt-015-yes',
        conditionId: 'cond-015',
        question: 'DOGE将达到$1吗？',
        outcomes: ['Yes', 'No'],
        outcomePrices: ['0.15', '0.85'],
        lastTradePrice: '0.15',
        bestBid: '0.14',
        bestAsk: '0.16',
        spread: 0.02,
        volume: '4560000',
        onchainMarketId: '15',
        clobTokenIds: ['token-015-yes', 'token-015-no'],
        resolutionStatus: 0,
        acceptingOrders: true,
        polymarketOrderBook: generateOrderBook(0.15),
      },
    ],
    syncedAt: new Date().toISOString(),
  },
  {
    eventId: 'evt-016',
    slug: 'premier-league-2025-champion',
    title: 'Manchester City夺得2024-25英超冠军',
    description:
      'Manchester City是否会赢得2024-25赛季英超联赛冠军？基于英超官方最终积分榜。',
    imageUrl: '⚽',
    iconUrl: '🏟️',
    startDate: '2024-08-01T00:00:00Z',
    endDate: '2025-05-25T23:59:59Z',
    active: true,
    closed: false,
    featured: false,
    volume: 3450000,
    volume24h: 123456,
    liquidity: 670000,
    openInterest: 1420000,
    tags: [
      { slug: 'sports', label: '体育' },
      { slug: 'football', label: '足球' },
    ],
    resolutionSource: 'Premier League',
    markets: [
      {
        marketId: 'mkt-016-yes',
        conditionId: 'cond-016',
        question: 'Man City将夺得英超冠军吗？',
        outcomes: ['Yes', 'No'],
        outcomePrices: ['0.45', '0.55'],
        lastTradePrice: '0.45',
        bestBid: '0.44',
        bestAsk: '0.46',
        spread: 0.02,
        volume: '3450000',
        onchainMarketId: '16',
        clobTokenIds: ['token-016-yes', 'token-016-no'],
        resolutionStatus: 0,
        acceptingOrders: true,
        polymarketOrderBook: generateOrderBook(0.45),
      },
    ],
    syncedAt: new Date().toISOString(),
  },
  {
    eventId: 'evt-017',
    slug: 'tiktok-ban-us-2025',
    title: 'TikTok在美国被禁止或出售',
    description:
      'TikTok是否会在2025年底前在美国被禁止运营或被迫出售给美国公司？基于法院判决或官方公告。',
    imageUrl: '📱',
    iconUrl: '🚫',
    startDate: '2025-01-01T00:00:00Z',
    endDate: '2025-12-31T23:59:59Z',
    active: true,
    closed: false,
    featured: true,
    volume: 6780000,
    volume24h: 234567,
    liquidity: 1340000,
    openInterest: 2780000,
    tags: [
      { slug: 'tech', label: '科技' },
      { slug: 'regulation', label: '监管' },
    ],
    resolutionSource: 'US Courts/DOJ',
    markets: [
      {
        marketId: 'mkt-017-yes',
        conditionId: 'cond-017',
        question: 'TikTok将被禁或出售吗？',
        outcomes: ['Yes', 'No'],
        outcomePrices: ['0.72', '0.28'],
        lastTradePrice: '0.72',
        bestBid: '0.71',
        bestAsk: '0.73',
        spread: 0.02,
        volume: '6780000',
        onchainMarketId: '17',
        clobTokenIds: ['token-017-yes', 'token-017-no'],
        resolutionStatus: 0,
        acceptingOrders: true,
        polymarketOrderBook: generateOrderBook(0.72),
      },
    ],
    syncedAt: new Date().toISOString(),
  },
  {
    eventId: 'evt-018',
    slug: 'ai-passes-bar-exam-2025',
    title: 'AI系统通过美国律师资格考试',
    description:
      '是否会有AI系统在2025年底前独立（无人类协助）通过美国州律师资格考试？基于官方考试机构确认。',
    imageUrl: '⚖️',
    iconUrl: '🧠',
    startDate: '2025-01-01T00:00:00Z',
    endDate: '2025-12-31T23:59:59Z',
    active: true,
    closed: false,
    featured: false,
    volume: 1230000,
    volume24h: 45678,
    liquidity: 240000,
    openInterest: 510000,
    tags: [
      { slug: 'tech', label: '科技' },
      { slug: 'ai', label: 'AI' },
    ],
    resolutionSource: 'State Bar Association',
    markets: [
      {
        marketId: 'mkt-018-yes',
        conditionId: 'cond-018',
        question: 'AI将通过律师资格考试吗？',
        outcomes: ['Yes', 'No'],
        outcomePrices: ['0.82', '0.18'],
        lastTradePrice: '0.82',
        bestBid: '0.81',
        bestAsk: '0.83',
        spread: 0.02,
        volume: '1230000',
        onchainMarketId: '18',
        clobTokenIds: ['token-018-yes', 'token-018-no'],
        resolutionStatus: 0,
        acceptingOrders: true,
        polymarketOrderBook: generateOrderBook(0.82),
      },
    ],
    syncedAt: new Date().toISOString(),
  },
  {
    eventId: 'evt-019',
    slug: 'argentina-copa-america-2025',
    title: '阿根廷卫冕2025美洲杯',
    description:
      '阿根廷国家队是否会赢得2025年美洲杯冠军？基于CONMEBOL官方比赛结果。',
    imageUrl: '🇦🇷',
    iconUrl: '🏟️',
    startDate: '2025-06-01T00:00:00Z',
    endDate: '2025-07-15T23:59:59Z',
    active: true,
    closed: false,
    featured: false,
    volume: 2890000,
    volume24h: 98765,
    liquidity: 560000,
    openInterest: 1180000,
    tags: [
      { slug: 'sports', label: '体育' },
      { slug: 'football', label: '足球' },
    ],
    resolutionSource: 'CONMEBOL',
    markets: [
      {
        marketId: 'mkt-019-yes',
        conditionId: 'cond-019',
        question: '阿根廷将卫冕美洲杯吗？',
        outcomes: ['Yes', 'No'],
        outcomePrices: ['0.38', '0.62'],
        lastTradePrice: '0.38',
        bestBid: '0.37',
        bestAsk: '0.39',
        spread: 0.02,
        volume: '2890000',
        onchainMarketId: '19',
        clobTokenIds: ['token-019-yes', 'token-019-no'],
        resolutionStatus: 0,
        acceptingOrders: true,
        polymarketOrderBook: generateOrderBook(0.38),
      },
    ],
    syncedAt: new Date().toISOString(),
  },
  {
    eventId: 'evt-020',
    slug: 'anthropic-valuation-100b',
    title: 'Anthropic估值超过$1000亿',
    description:
      'Anthropic是否会在2025年底前在融资轮中达到或超过$1000亿估值？基于可靠财经媒体报道。',
    imageUrl: '🅰️',
    iconUrl: '✨',
    startDate: '2025-01-01T00:00:00Z',
    endDate: '2025-12-31T23:59:59Z',
    active: true,
    closed: false,
    featured: true,
    volume: 1560000,
    volume24h: 56789,
    liquidity: 310000,
    openInterest: 650000,
    tags: [
      { slug: 'tech', label: '科技' },
      { slug: 'ai', label: 'AI' },
      { slug: 'startup', label: '创业公司' },
    ],
    resolutionSource: 'Bloomberg/Reuters',
    markets: [
      {
        marketId: 'mkt-020-yes',
        conditionId: 'cond-020',
        question: 'Anthropic估值将超$1000亿吗？',
        outcomes: ['Yes', 'No'],
        outcomePrices: ['0.25', '0.75'],
        lastTradePrice: '0.25',
        bestBid: '0.24',
        bestAsk: '0.26',
        spread: 0.02,
        volume: '1560000',
        onchainMarketId: '20',
        clobTokenIds: ['token-020-yes', 'token-020-no'],
        resolutionStatus: 0,
        acceptingOrders: true,
        polymarketOrderBook: generateOrderBook(0.25),
      },
    ],
    syncedAt: new Date().toISOString(),
  },
];

// 转换为 EventSummary 格式
function toEventSummary(event: EventDetail): EventSummary {
  const { resolutionSource, ...summary } = event;
  return {
    ...summary,
    markets: event.markets.map((m) => ({
      marketId: m.marketId,
      conditionId: m.conditionId,
      question: m.question,
      outcomes: m.outcomes,
      outcomePrices: m.outcomePrices,
      lastTradePrice: m.lastTradePrice,
      bestBid: m.bestBid,
      bestAsk: m.bestAsk,
      spread: m.spread,
      volume: m.volume,
      onchainMarketId: m.onchainMarketId,
    })),
  };
}

// 缓存价格历史，保持一致性
const priceHistoryCache: Record<string, PriceHistory> = {};

// Mock API 实现
export const mockApi = {
  // 获取事件列表
  fetchEvents(params?: {
    limit?: number;
    offset?: number;
    tag?: string;
    sortBy?: 'volume' | 'volume24h' | 'liquidity' | 'endDate' | 'createdAt';
    order?: 'asc' | 'desc';
    search?: string;
  }): EventSummary[] {
    let events = mockEventsData.map(toEventSummary);

    // 搜索过滤
    if (params?.search) {
      const searchLower = params.search.toLowerCase();
      events = events.filter(
        (e) =>
          e.title.toLowerCase().includes(searchLower) ||
          e.description.toLowerCase().includes(searchLower)
      );
    }

    // 标签过滤
    if (params?.tag) {
      events = events.filter((e) => e.tags.some((t) => t.slug === params.tag));
    }

    // 排序
    if (params?.sortBy) {
      const sortKey = params.sortBy;
      const order = params.order === 'asc' ? 1 : -1;
      events.sort((a, b) => {
        const aVal = a[sortKey as keyof EventSummary];
        const bVal = b[sortKey as keyof EventSummary];
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return (aVal - bVal) * order;
        }
        return 0;
      });
    }

    // 分页
    const offset = params?.offset ?? 0;
    const limit = params?.limit ?? 20;
    return events.slice(offset, offset + limit);
  },

  // 获取事件详情
  fetchEventDetail(eventId: string): EventDetail | null {
    return mockEventsData.find((e) => e.eventId === eventId) ?? null;
  },

  // 获取订单簿
  fetchOrderBook(eventId: string, marketId: string): OrderBookData | null {
    const event = mockEventsData.find((e) => e.eventId === eventId);
    if (!event) return null;
    const market = event.markets.find((m) => m.marketId === marketId);
    if (!market) return null;
    // 每次返回新生成的订单簿以模拟实时更新
    const price = parseFloat(market.outcomePrices[0]);
    return generateOrderBook(price);
  },

  // 获取价格历史
  fetchPriceHistory(
    eventId: string,
    marketId: string,
    params?: { interval?: '1h' | '1d' | '1w' | 'max'; outcome?: 'yes' | 'no' }
  ): PriceHistory | null {
    const event = mockEventsData.find((e) => e.eventId === eventId);
    if (!event) return null;
    const market = event.markets.find((m) => m.marketId === marketId);
    if (!market) return null;

    const interval = params?.interval ?? '1d';
    const outcome = params?.outcome ?? 'yes';
    const cacheKey = `${marketId}-${outcome}-${interval}`;

    // 检查缓存
    if (!priceHistoryCache[cacheKey]) {
      const basePrice =
        outcome === 'yes'
          ? parseFloat(market.outcomePrices[0])
          : parseFloat(market.outcomePrices[1]);
      priceHistoryCache[cacheKey] = generatePriceHistory(
        marketId,
        outcome,
        interval,
        basePrice,
        0.03
      );
    }

    return priceHistoryCache[cacheKey];
  },
};

// 测试模式配置
export const TEST_MODE = {
  enabled: true, // 默认启用测试模式

  // 切换测试模式
  setEnabled(value: boolean) {
    this.enabled = value;
  },
};

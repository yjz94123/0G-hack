# 后端开发 PRD - Polymarket 数据服务

| 文档版本 | 日期 | 角色 | 状态 |
| :--- | :--- | :--- | :--- |
| v1.0 | 2026-01-31 | 后端开发（成员D） | 草稿 |

## 1. 文档目的

本文档是主 PRD 的子文档，专门面向**后端开发（成员D）**角色，详细定义 Polymarket 数据聚合服务的开发需求、Polymarket 上游 API 调用规范、本地缓存策略、数据模型、以及与其他模块（前端、AI、合约）的对接方式。

## 2. 职责范围

| 职责 | 描述 | 优先级 |
| :--- | :--- | :--- |
| Polymarket 数据同步 | 从 Polymarket Gamma API 和 CLOB API 拉取 events/markets/orderbook 数据 | P0 |
| RESTful API 网关 | 为前端提供统一的市场列表、详情、订单簿、价格历史等接口 | P0 |
| 0G Storage 数据存证 | 将交易记录、AI 分析结果、市场快照持久化到 0G 存储 | P0 |
| 预言机 (Oracle) 服务 | 监控已解析市场，将结果提交到链上 TradingHub 合约 | P1 |
| AI 分析任务管理 | 管理 AI 分析任务的生命周期（创建/查询/存储） | P1 |

## 3. 技术栈

```
Runtime:        Node.js 20+ (LTS)
Language:       TypeScript 5.x
Framework:      Express.js (路由 + 中间件)
ORM/DB:         Prisma + PostgreSQL (本地缓存/任务状态)
HTTP Client:    axios (调用 Polymarket API)
Web3:           ethers.js v6 (链上交互)
0G Storage:     @0glabs/0g-ts-sdk (KV + 文件存储)
0G Compute:     @0glabs/0g-serving-broker (AI 推理)
Scheduler:      node-cron (定时任务)
Validation:     zod (请求参数校验)
Logging:        pino
Testing:        vitest + supertest
```

## 4. Polymarket 上游 API 规范

本节详细记录我们需要调用的 Polymarket 官方 API，是后端数据同步的核心依据。

### 4.1. API 总览

Polymarket 提供两套主要 API：

| API | Base URL | 用途 | 认证 |
| :--- | :--- | :--- | :--- |
| **Gamma API** | `https://gamma-api.polymarket.com` | 事件/市场元数据查询（只读） | 无需认证 |
| **CLOB API** | `https://clob.polymarket.com` | 订单簿/价格/交易数据（只读部分无需认证） | 只读部分无需认证 |

> **重要**: 我们只使用只读接口，不涉及下单/取消等需要 L2 认证的写操作。所有交易在 0G 测试网上的 TradingHub 合约中完成。

### 4.2. Gamma API - Events（事件）

事件（Event）是 Polymarket 中的顶层概念，一个 Event 下可包含多个 Market（子市场）。

**Endpoint**: `GET https://gamma-api.polymarket.com/events`

**Query Parameters**:

| 参数 | 类型 | 必填 | 默认 | 描述 |
| :--- | :--- | :--- | :--- | :--- |
| `limit` | int | 否 | 20 | 每页数量，建议不超过100 |
| `offset` | int | 否 | 0 | 分页偏移量 |
| `active` | boolean | 否 | - | 是否只返回活跃事件 |
| `closed` | boolean | 否 | - | 是否只返回已关闭事件 |
| `order` | string | 否 | - | 排序字段 (e.g. `volume`) |
| `ascending` | boolean | 否 | false | 升序/降序 |
| `tag` | string | 否 | - | 按标签筛选 |

**响应结构** (单个 Event 对象):

```json
{
    "id": "string",                    // 事件唯一ID
    "ticker": "string",                // 事件ticker标识
    "slug": "string",                  // URL友好的slug
    "title": "string",                 // 事件标题
    "description": "string",           // 事件描述和解析规则
    "resolutionSource": "string",      // 解析数据源URL
    "startDate": "ISO8601",            // 开始时间
    "endDate": "ISO8601",              // 结束时间
    "creationDate": "ISO8601",         // 创建时间
    "image": "url",                    // 事件图片
    "icon": "url",                     // 事件图标
    "active": true,                    // 是否活跃
    "closed": false,                   // 是否已关闭
    "archived": false,                 // 是否已归档
    "featured": false,                 // 是否推荐
    "restricted": false,               // 是否受限
    "new": false,                      // 是否新建
    "liquidity": 123456.78,            // 流动性 (USD)
    "volume": 9876543.21,              // 总交易量 (USD)
    "volume24hr": 12345.67,            // 24小时交易量
    "volume1wk": 56789.12,             // 1周交易量
    "volume1mo": 234567.89,            // 1月交易量
    "openInterest": 456789.01,         // 未平仓量
    "competitive": 0.95,               // 竞争度指标
    "tags": [                          // 标签列表
        {"id": "string", "slug": "string", "label": "string"}
    ],
    "markets": [                       // 子市场列表
        { /* Market对象, 见4.3节 */ }
    ]
}
```

**获取单个事件**:
- `GET https://gamma-api.polymarket.com/events/{id}`
- `GET https://gamma-api.polymarket.com/events/slug/{slug}`

### 4.3. Gamma API - Markets（市场/子市场）

市场（Market）是具体的交易标的，属于某个 Event。每个 Market 有 YES/NO 两个 outcome。

**Endpoint**: `GET https://gamma-api.polymarket.com/markets`

**Query Parameters**:

| 参数 | 类型 | 必填 | 默认 | 描述 |
| :--- | :--- | :--- | :--- | :--- |
| `limit` | int | 否 | 20 | 每页数量 |
| `offset` | int | 否 | 0 | 分页偏移量 |
| `active` | boolean | 否 | - | 是否活跃 |
| `closed` | boolean | 否 | - | 是否关闭 |
| `order` | string | 否 | - | 排序字段 |
| `ascending` | boolean | 否 | false | 排序方向 |

**响应结构** (单个 Market 对象):

```json
{
    "id": "string",                    // 市场唯一ID (数字字符串)
    "conditionId": "0x...",            // 链上condition ID (hex)
    "questionID": "0x...",             // 问题ID
    "slug": "string",                  // URL slug
    "question": "string",             // 市场问题
    "description": "string",          // 详细描述
    "outcomes": ["Yes", "No"],         // 可能的结果
    "outcomePrices": ["0.55", "0.45"], // 当前结果价格
    "startDate": "ISO8601",
    "endDate": "ISO8601",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601",
    "active": true,
    "closed": false,
    "archived": false,
    "approved": true,
    "restricted": false,
    "volume": "1234567.89",           // 字符串格式
    "volume24hr": 12345.67,           // 数值格式 (注意类型不一致)
    "volume1wk": 56789.12,
    "volume1mo": 234567.89,
    "liquidity": "98765.43",
    "lastTradePrice": "0.55",         // 最后成交价
    "bestBid": "0.54",                // 最优买价
    "bestAsk": "0.56",                // 最优卖价
    "spread": 0.02,                   // 买卖价差
    "clobTokenIds": [                  // CLOB交易用的token ID
        "YES_TOKEN_ID_STRING",        // YES token (用于查询订单簿)
        "NO_TOKEN_ID_STRING"          // NO token
    ],
    "negRiskMarketID": "string",
    "acceptingOrders": true,
    "enableOrderBook": true,
    "events": [                        // 所属事件信息
        { /* 简化的Event对象 */ }
    ]
}
```

**获取单个市场**:
- `GET https://gamma-api.polymarket.com/markets/{id}`
- `GET https://gamma-api.polymarket.com/markets/slug/{slug}`

### 4.4. CLOB API - 订单簿 (Order Book)

订单簿数据需要通过 CLOB API 获取，使用市场的 `clobTokenIds` 作为参数。

#### 4.4.1. 获取单个订单簿

**Endpoint**: `GET https://clob.polymarket.com/book`

**Query Parameters**:

| 参数 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| `token_id` | string | 是 | 从 Gamma market 的 `clobTokenIds[0]` 获取 (YES token) |

**响应结构**:

```json
{
    "market": "conditionId",
    "asset_id": "token_id",
    "hash": "0x...",
    "timestamp": "1706702400",
    "bids": [
        {"price": "0.55", "size": "1000.00"},
        {"price": "0.54", "size": "2500.00"},
        {"price": "0.53", "size": "5000.00"}
    ],
    "asks": [
        {"price": "0.56", "size": "800.00"},
        {"price": "0.57", "size": "1500.00"},
        {"price": "0.58", "size": "3000.00"}
    ]
}
```

#### 4.4.2. 批量获取订单簿

**Endpoint**: `POST https://clob.polymarket.com/books`

**Request Body**:
```json
[
    {"token_id": "TOKEN_ID_1"},
    {"token_id": "TOKEN_ID_2"}
]
```

**Rate Limit**: 50 requests / 10s (API), 300 requests / 10s (网站)

#### 4.4.3. 获取价格

**单个价格**: `GET https://clob.polymarket.com/price?token_id={tokenId}&side={BUY|SELL}`

**中间价**: `GET https://clob.polymarket.com/midpoint?token_id={tokenId}`

**价格历史**: `GET https://clob.polymarket.com/prices-history?market={tokenId}&interval={1h|1d|1w|max}`

### 4.5. CLOB API - Market 信息

CLOB API 也提供 Market 数据，字段名与 Gamma API 略有不同。

**Endpoint**: `GET https://clob.polymarket.com/markets/{conditionId}`

**响应结构**:

```json
{
    "condition_id": "0x...",
    "question": "string",
    "description": "string",
    "tokens": [
        {
            "token_id": "string",
            "outcome": "Yes",
            "price": 0.55,
            "winner": false
        },
        {
            "token_id": "string",
            "outcome": "No",
            "price": 0.45,
            "winner": false
        }
    ],
    "maker_base_fee": 0,
    "taker_base_fee": 0,
    "neg_risk": false,
    "accepting_orders": true,
    "minimum_order_size": 5,
    "minimum_tick_size": 0.01,
    "end_date_iso": "ISO8601",
    "market_slug": "string",
    "active": true,
    "closed": false
}
```

### 4.6. Rate Limits 汇总

| 端点 | 限制 | 窗口 |
| :--- | :--- | :--- |
| `GET /book` (CLOB, API调用) | 50 次 | 10秒 |
| `GET /book` (CLOB, 网站) | 300 次 | 10秒 |
| `GET /price` | 100 次 | 10秒 |
| Gamma API `/events`, `/markets` | 无明确限制 | 建议控制在100次/分钟 |

### 4.7. 地区限制

Polymarket API 对部分地区有访问限制。后端服务器部署时需注意选择**非受限地区**的服务器。

受限地区包括: 美国、中国大陆、俄罗斯、欧盟部分成员国等33个国家/地区。

**检查端点**: `GET https://polymarket.com/api/geoblock`

## 5. 数据模型设计

### 5.1. 本地数据库 (PostgreSQL)

数据库用于缓存 Polymarket 数据和管理应用状态，不是数据的权威来源（权威来源是 Polymarket API 和 0G Storage）。

#### 表: `events` - 事件缓存

```sql
CREATE TABLE events (
    id                VARCHAR(64) PRIMARY KEY,  -- Polymarket event ID
    slug              VARCHAR(256) UNIQUE NOT NULL,
    title             TEXT NOT NULL,
    description       TEXT,
    resolution_source TEXT,
    image_url         TEXT,
    icon_url          TEXT,
    start_date        TIMESTAMPTZ,
    end_date          TIMESTAMPTZ,
    active            BOOLEAN DEFAULT true,
    closed            BOOLEAN DEFAULT false,
    featured          BOOLEAN DEFAULT false,
    volume            DECIMAL(20,2) DEFAULT 0,
    volume_24h        DECIMAL(20,2) DEFAULT 0,
    liquidity         DECIMAL(20,2) DEFAULT 0,
    open_interest     DECIMAL(20,2) DEFAULT 0,
    tags              JSONB DEFAULT '[]',        -- [{id, slug, label}]
    raw_data          JSONB,                     -- 原始Polymarket响应
    synced_at         TIMESTAMPTZ DEFAULT NOW(), -- 最后同步时间
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_active ON events(active, closed);
CREATE INDEX idx_events_volume ON events(volume DESC);
CREATE INDEX idx_events_synced_at ON events(synced_at);
```

#### 表: `markets` - 市场缓存

```sql
CREATE TABLE markets (
    id                VARCHAR(64) PRIMARY KEY,    -- Polymarket market ID
    event_id          VARCHAR(64) REFERENCES events(id),
    condition_id      VARCHAR(66) NOT NULL,        -- 链上condition ID (0x...)
    question_id       VARCHAR(66),
    slug              VARCHAR(256),
    question          TEXT NOT NULL,
    description       TEXT,
    outcomes          JSONB DEFAULT '["Yes","No"]',
    outcome_prices    JSONB DEFAULT '["0.5","0.5"]',
    clob_token_ids    JSONB NOT NULL,              -- [YES_token_id, NO_token_id]
    start_date        TIMESTAMPTZ,
    end_date          TIMESTAMPTZ,
    active            BOOLEAN DEFAULT true,
    closed            BOOLEAN DEFAULT false,
    accepting_orders  BOOLEAN DEFAULT true,
    volume            DECIMAL(20,2) DEFAULT 0,
    volume_24h        DECIMAL(20,2) DEFAULT 0,
    liquidity         DECIMAL(20,2) DEFAULT 0,
    last_trade_price  VARCHAR(10),
    best_bid          VARCHAR(10),
    best_ask          VARCHAR(10),
    spread            DECIMAL(10,4),
    neg_risk          BOOLEAN DEFAULT false,
    neg_risk_market_id VARCHAR(66),
    -- 链上映射 (TradingHub 合约中的 marketId)
    onchain_market_id VARCHAR(66),                 -- bytes32, keccak256(conditionId)
    resolution_status SMALLINT DEFAULT 0,          -- 0:未解析 1:NO胜 2:YES胜
    resolved_at       TIMESTAMPTZ,
    raw_data          JSONB,
    synced_at         TIMESTAMPTZ DEFAULT NOW(),
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_markets_event_id ON markets(event_id);
CREATE INDEX idx_markets_condition_id ON markets(condition_id);
CREATE INDEX idx_markets_active ON markets(active, closed);
CREATE INDEX idx_markets_volume ON markets(volume DESC);
CREATE INDEX idx_markets_onchain_id ON markets(onchain_market_id);
```

#### 表: `analysis_tasks` - AI分析任务

```sql
CREATE TABLE analysis_tasks (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id     VARCHAR(64) REFERENCES markets(id),
    status        VARCHAR(20) DEFAULT 'pending', -- pending/processing/completed/failed
    prediction    VARCHAR(3),                     -- YES/NO
    confidence    SMALLINT,                       -- 0-100
    pro_arguments JSONB,
    con_arguments JSONB,
    reasoning     TEXT,
    og_storage_key VARCHAR(256),                  -- 0G Storage中的key
    error_message TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analysis_market ON analysis_tasks(market_id);
CREATE INDEX idx_analysis_status ON analysis_tasks(status);
```

#### 表: `trade_records` - 交易记录

```sql
CREATE TABLE trade_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_address    VARCHAR(42) NOT NULL,          -- 用户钱包地址
    market_id       VARCHAR(64) REFERENCES markets(id),
    onchain_order_id BIGINT,                       -- 链上orderId
    outcome         SMALLINT NOT NULL,              -- 0:NO 1:YES
    price           DECIMAL(5,2) NOT NULL,          -- 1-99
    amount          DECIMAL(20,6) NOT NULL,         -- dUSDC数量
    trade_type      VARCHAR(4) NOT NULL,            -- buy/sell
    status          VARCHAR(20) DEFAULT 'pending',  -- pending/filled/cancelled
    tx_hash         VARCHAR(66),                    -- 链上交易hash
    og_storage_key  VARCHAR(256),                   -- 0G Storage中的key
    og_root_hash    VARCHAR(66),                    -- 0G Storage rootHash
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trades_user ON trade_records(user_address);
CREATE INDEX idx_trades_market ON trade_records(market_id);
CREATE INDEX idx_trades_status ON trade_records(status);
```

#### 表: `market_snapshots` - 市场快照索引

```sql
CREATE TABLE market_snapshots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_type   VARCHAR(20) NOT NULL,           -- full/single_market
    market_id       VARCHAR(64),                    -- 单市场快照时有值
    og_root_hash    VARCHAR(66) NOT NULL,            -- 0G Storage文件rootHash
    market_count    INT,
    best_bid        VARCHAR(10),
    best_ask        VARCHAR(10),
    total_bid_size  DECIMAL(20,2),
    total_ask_size  DECIMAL(20,2),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_snapshots_market ON market_snapshots(market_id);
CREATE INDEX idx_snapshots_created ON market_snapshots(created_at DESC);
```

### 5.2. 0G Storage Key 设计

| 数据类型 | Key 格式 | Value 内容 | 存储方式 |
| :--- | :--- | :--- | :--- |
| 交易记录 | `trade:{userAddress}:{orderId}` | TradeRecord JSON | KV |
| AI分析结果 | `analysis:{marketId}:{taskId}` | AnalysisResult JSON | KV |
| 市场元信息索引 | `market:{conditionId}` | MarketMeta JSON | KV |
| 市场快照 | 文件名 `snapshot-{timestamp}.json` | 全量市场+订单簿数据 | File |

## 6. 数据同步策略

### 6.1. 同步任务总览

| 任务 | 频率 | 数据源 | 目标 |
| :--- | :--- | :--- | :--- |
| 事件列表同步 | 每5分钟 | Gamma `/events` | PostgreSQL `events` |
| 市场数据同步 | 每3分钟 | Gamma `/markets` | PostgreSQL `markets` |
| 订单簿刷新 | 每30秒 (热门) / 每2分钟 (其他) | CLOB `/book` | 内存缓存 |
| 价格更新 | 每30秒 | CLOB `/midpoint` | 内存缓存 |
| 已解析市场检测 | 每5分钟 | Gamma `/events?closed=true` | Oracle逻辑 |
| 市场快照 | 每30分钟 | 本地缓存 | 0G Storage (File) |

### 6.2. 事件同步流程

```
[node-cron: 每5分钟]
    |
    v
GET gamma-api/events?active=true&limit=100&order=volume&ascending=false
    |
    v
遍历每个event:
    ├─ event已存在? → UPDATE (volume, prices等字段)
    └─ event不存在? → INSERT
    |
    v
对于每个event.markets:
    ├─ market已存在? → UPDATE
    └─ market不存在? → INSERT, 计算 onchain_market_id = keccak256(conditionId)
    |
    v
标记 synced_at = NOW()
```

### 6.3. 订单簿缓存策略

订单簿数据变化频繁，不适合存入数据库，使用内存缓存 + TTL。

```typescript
// 内存中的订单簿缓存
interface OrderBookCache {
    [tokenId: string]: {
        data: OrderBook;
        fetchedAt: number;     // 时间戳
        ttl: number;           // 毫秒
    }
}

// 热门市场 (volume > 100k): TTL = 30秒
// 普通市场: TTL = 120秒
// 冷门市场 (volume < 1k): TTL = 300秒 (按需获取)
```

### 6.4. Polymarket Market ID 到链上 Market ID 的映射

TradingHub 合约使用 `bytes32 marketId` 标识市场，我们需要建立映射：

```typescript
import { ethers } from 'ethers';

function polymarketToOnchainId(conditionId: string): string {
    // conditionId 已经是 bytes32 格式 (0x...)，可直接使用
    // 或者使用 keccak256 做二次哈希
    return ethers.keccak256(ethers.toUtf8Bytes(conditionId));
}
```

## 7. 定时任务详细设计

### 7.1. 数据同步器 (DataSyncer)

```typescript
class DataSyncer {
    // 每5分钟：同步事件和市场
    async syncEventsAndMarkets(): Promise<void> {
        // 1. 拉取活跃事件 (分页，最多500个)
        // 2. Upsert到数据库
        // 3. 对每个事件的子市场做upsert
        // 4. 检测新增市场，计算 onchain_market_id
    }

    // 每30秒/2分钟：刷新订单簿 (区分热门/普通)
    async refreshOrderBooks(): Promise<void> {
        // 1. 从数据库获取活跃市场列表
        // 2. 按volume分级
        // 3. 批量调用 CLOB /books (每批不超过20个token_id)
        // 4. 更新内存缓存
        // 5. 注意 rate limit: 50次/10秒
    }

    // 每30秒：刷新价格
    async refreshPrices(): Promise<void> {
        // 1. 获取活跃市场的 token_ids
        // 2. 批量获取 midpoint 价格
        // 3. 更新数据库中的 outcome_prices, best_bid, best_ask
    }
}
```

### 7.2. 预言机服务 (OracleService)

```typescript
class OracleService {
    // 每5分钟：检测已解析市场
    async checkResolvedMarkets(): Promise<void> {
        // 1. 从 Gamma API 获取最近关闭的事件
        //    GET /events?closed=true&active=false&limit=50
        // 2. 遍历每个事件下的market
        // 3. 检查 market 的 outcomePrices:
        //    - 如果 outcomePrices = ["1","0"], 则 YES 胜出
        //    - 如果 outcomePrices = ["0","1"], 则 NO 胜出
        // 4. 对比数据库中该市场的 resolution_status
        //    - 如果本地仍为 0 (未解析)，且链上也未解析
        //    - 调用 TradingHub.resolveMarket(onchainMarketId, winningOutcome)
        // 5. 更新本地数据库 resolution_status 和 resolved_at
    }
}
```

### 7.3. 快照服务 (SnapshotService)

```typescript
class SnapshotService {
    // 每30分钟：生成并上传市场快照到0G Storage
    async createAndUploadSnapshot(): Promise<void> {
        // 1. 从内存缓存和数据库收集所有活跃市场数据
        // 2. 包含：市场基本信息 + 当前订单簿 + 当前价格
        // 3. 序列化为JSON
        // 4. 通过 ZgFile.fromStream 创建文件
        // 5. 上传到 0G Storage，获得 rootHash
        // 6. 在 market_snapshots 表记录索引
    }
}
```

## 8. 错误处理与容错

### 8.1. Polymarket API 调用容错

```typescript
// 重试策略
const RETRY_CONFIG = {
    maxRetries: 3,
    baseDelay: 1000,     // 1秒
    maxDelay: 10000,     // 10秒
    backoffMultiplier: 2 // 指数退避
};

// Rate Limit 处理
// - 收到 429 状态码时，暂停该端点的调用
// - 按 Retry-After header 或默认10秒后重试
// - 订单簿批量请求间隔至少200ms

// 数据校验
// - 解析 Polymarket 响应时做 zod schema 校验
// - 异常数据记录日志但不中断同步流程
```

### 8.2. 0G Storage 调用容错

```typescript
// 0G Storage 写入失败不阻塞主业务流程
// 失败的写入任务推入重试队列
// 最多重试5次，间隔递增
// 持续失败则记录到本地日志表 (storage_failures)
```

### 8.3. Oracle 调用容错

```typescript
// resolveMarket 是链上交易，需特别注意:
// - 提交前检查nonce，避免重复提交
// - 设置合理gas limit
// - 交易失败后不立即重试，等待下一个检测周期
// - 记录每次提交的txHash供追溯
```

## 9. 项目目录结构

```
backend/
├── src/
│   ├── index.ts                    // 入口文件
│   ├── app.ts                      // Express app 初始化
│   ├── config/
│   │   ├── index.ts                // 环境变量加载
│   │   ├── database.ts             // 数据库配置
│   │   └── constants.ts            // 常量定义
│   ├── routes/
│   │   ├── markets.ts              // /api/v1/markets
│   │   ├── analysis.ts             // /api/v1/analysis
│   │   ├── trades.ts               // /api/v1/trades
│   │   └── snapshots.ts            // /api/v1/markets/:id/snapshots
│   ├── services/
│   │   ├── polymarket/
│   │   │   ├── gamma-client.ts     // Gamma API 封装
│   │   │   ├── clob-client.ts      // CLOB API 封装
│   │   │   └── types.ts            // Polymarket 数据类型
│   │   ├── sync/
│   │   │   ├── data-syncer.ts      // 数据同步器
│   │   │   ├── orderbook-cache.ts  // 订单簿内存缓存
│   │   │   └── price-updater.ts    // 价格更新器
│   │   ├── oracle/
│   │   │   └── oracle-service.ts   // 预言机服务
│   │   ├── storage/
│   │   │   ├── og-kv-client.ts     // 0G KV 存储封装
│   │   │   ├── og-file-client.ts   // 0G 文件存储封装
│   │   │   └── snapshot-service.ts // 快照服务
│   │   ├── ai/
│   │   │   ├── ai-service.ts       // AI 分析服务
│   │   │   ├── og-compute.ts       // 0G Compute 封装
│   │   │   └── prompts.ts          // Prompt 模板
│   │   └── contract/
│   │       └── trading-hub.ts      // TradingHub 合约交互
│   ├── middleware/
│   │   ├── error-handler.ts        // 全局错误处理
│   │   ├── rate-limiter.ts         // API限流
│   │   └── validator.ts            // 参数校验
│   ├── models/                     // Prisma model 自动生成
│   ├── utils/
│   │   ├── logger.ts               // 日志工具
│   │   ├── retry.ts                // 重试工具
│   │   └── id-mapping.ts           // ID映射工具
│   └── types/
│       └── index.ts                // 全局类型定义
├── prisma/
│   └── schema.prisma               // 数据库Schema
├── tests/
│   ├── services/
│   └── routes/
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## 10. 环境变量

```bash
# 服务
PORT=3001
NODE_ENV=development

# 数据库
DATABASE_URL=postgresql://user:pass@localhost:5432/prediction_market

# Polymarket API (无需认证，但可配置代理)
POLYMARKET_GAMMA_BASE_URL=https://gamma-api.polymarket.com
POLYMARKET_CLOB_BASE_URL=https://clob.polymarket.com

# 0G 测试网
OG_RPC_URL=https://evmrpc-testnet.0g.ai/

# 0G Storage
OG_STORAGE_INDEXER_RPC=https://indexer-storage-testnet-turbo.0g.ai
STORAGE_PRIVATE_KEY=your_storage_wallet_private_key
OG_KV_STREAM_ID=your_stream_id
OG_KV_NODE_RPC=http://kv_node_address:6789

# 0G Compute Network (AI)
COMPUTE_PRIVATE_KEY=your_compute_wallet_private_key

# 合约地址
DEMO_USDC_ADDRESS=0x...
TRADING_HUB_ADDRESS=0x...

# Oracle
ORACLE_PRIVATE_KEY=your_oracle_wallet_private_key

# 同步配置
SYNC_EVENTS_INTERVAL_MS=300000       # 5分钟
SYNC_ORDERBOOK_HOT_INTERVAL_MS=30000 # 30秒
SYNC_ORDERBOOK_COLD_INTERVAL_MS=120000 # 2分钟
SYNC_PRICE_INTERVAL_MS=30000         # 30秒
ORACLE_CHECK_INTERVAL_MS=300000      # 5分钟
SNAPSHOT_INTERVAL_MS=1800000         # 30分钟
```

## 11. 开发任务拆解

### Phase 1: 基础框架 + Polymarket 数据同步

| # | 任务 | 依赖 | 产出 |
| :--- | :--- | :--- | :--- |
| 1.1 | 初始化项目：TypeScript + Express + Prisma | 无 | 可运行的空服务 |
| 1.2 | 数据库 schema 设计和迁移 | 1.1 | 数据库表结构 |
| 1.3 | Gamma API Client 封装 | 1.1 | `gamma-client.ts` |
| 1.4 | CLOB API Client 封装 | 1.1 | `clob-client.ts` |
| 1.5 | 事件/市场数据同步器 | 1.2, 1.3 | `data-syncer.ts` |
| 1.6 | 订单簿内存缓存 + 刷新 | 1.4 | `orderbook-cache.ts` |
| 1.7 | `GET /markets` + `GET /markets/:id` API | 1.5, 1.6 | 可测试的API端点 |

### Phase 2: 0G 集成

| # | 任务 | 依赖 | 产出 |
| :--- | :--- | :--- | :--- |
| 2.1 | 0G Storage KV Client 封装 | 1.1 | `og-kv-client.ts` |
| 2.2 | 0G Storage File Client 封装 | 1.1 | `og-file-client.ts` |
| 2.3 | 0G Compute Network 封装 | 1.1 | `og-compute.ts` |
| 2.4 | AI 分析服务实现 | 2.3 | `ai-service.ts` |
| 2.5 | `POST /markets/:id/analyze` + `GET /analysis/:id` API | 2.4 | 可测试的AI API |
| 2.6 | 市场快照服务 | 2.2, 1.6 | `snapshot-service.ts` |
| 2.7 | 交易记录存证服务 | 2.1 | 存证写入/读取 |

### Phase 3: Oracle + 高级功能

| # | 任务 | 依赖 | 产出 |
| :--- | :--- | :--- | :--- |
| 3.1 | TradingHub 合约交互封装 | 合约部署 | `trading-hub.ts` |
| 3.2 | Oracle 服务实现 | 3.1, 1.5 | `oracle-service.ts` |
| 3.3 | `GET /trades/:address` API | 2.1, 2.7 | 交易历史接口 |
| 3.4 | `GET /markets/:id/snapshots` API | 2.6 | 快照查询接口 |
| 3.5 | 全局错误处理 + 日志 | - | 中间件 |
| 3.6 | 集成测试 | 全部 | 测试报告 |

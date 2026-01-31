# 后端 API 接口设计文档

| 文档版本 | 日期 | 状态 |
| :--- | :--- | :--- |
| v1.0 | 2026-01-31 | 草稿 |

## 1. 全局约定

### 1.1. Base URL

```
开发环境: http://localhost:3001/api/v1
生产环境: https://{domain}/api/v1
```

### 1.2. 通用响应格式

**成功响应**:

```json
{
    "success": true,
    "data": { ... },
    "meta": {              // 分页接口才有
        "total": 150,
        "limit": 20,
        "offset": 0
    }
}
```

**错误响应**:

```json
{
    "success": false,
    "error": {
        "code": "MARKET_NOT_FOUND",
        "message": "Market with id 'xxx' not found"
    }
}
```

### 1.3. 通用错误码

| HTTP状态码 | 错误码 | 描述 |
| :--- | :--- | :--- |
| 400 | `INVALID_PARAMS` | 请求参数校验失败 |
| 404 | `MARKET_NOT_FOUND` | 市场不存在 |
| 404 | `EVENT_NOT_FOUND` | 事件不存在 |
| 404 | `TASK_NOT_FOUND` | 分析任务不存在 |
| 429 | `RATE_LIMIT_EXCEEDED` | 请求频率超限 |
| 500 | `INTERNAL_ERROR` | 内部服务错误 |
| 502 | `UPSTREAM_ERROR` | 上游Polymarket API异常 |
| 503 | `SERVICE_UNAVAILABLE` | 数据同步中/服务初始化中 |

### 1.4. 通用请求头

```
Content-Type: application/json
Accept: application/json
```

> 注: 当前版本不需要用户认证。交易操作直接由前端与链上合约交互，后端只提供数据查询服务。

---

## 2. 市场接口 (Markets)

### 2.1. 获取市场（事件）列表

获取聚合自 Polymarket 的预测市场事件列表。每个事件可能包含一个或多个子市场。

```
GET /api/v1/markets
```

**Query Parameters**:

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| `limit` | integer | 否 | 20 | 每页数量 (1-100) |
| `offset` | integer | 否 | 0 | 偏移量 (>=0) |
| `sortBy` | string | 否 | `volume` | 排序字段: `volume`, `volume24h`, `liquidity`, `endDate`, `createdAt` |
| `order` | string | 否 | `desc` | 排序方向: `asc`, `desc` |
| `active` | boolean | 否 | `true` | 筛选活跃事件 |
| `tag` | string | 否 | - | 按标签筛选 (e.g. `politics`, `crypto`, `sports`) |
| `search` | string | 否 | - | 标题关键词搜索 |

**Success Response (200 OK)**:

```json
{
    "success": true,
    "data": [
        {
            "eventId": "12345",
            "slug": "will-ethereum-reach-5000",
            "title": "Will Ethereum reach $5,000 by end of 2026?",
            "description": "This market resolves to 'Yes' if the price of Ethereum...",
            "imageUrl": "https://polymarket-upload.s3.us-east-2.amazonaws.com/...",
            "iconUrl": "https://...",
            "startDate": "2026-01-15T00:00:00Z",
            "endDate": "2026-12-31T23:59:59Z",
            "active": true,
            "closed": false,
            "featured": true,
            "volume": 1250000.50,
            "volume24h": 45678.90,
            "liquidity": 234567.89,
            "openInterest": 567890.12,
            "tags": [
                {"slug": "crypto", "label": "Crypto"}
            ],
            "markets": [
                {
                    "marketId": "67890",
                    "conditionId": "0xabc123...",
                    "question": "Will Ethereum reach $5,000 by end of 2026?",
                    "outcomes": ["Yes", "No"],
                    "outcomePrices": ["0.35", "0.65"],
                    "lastTradePrice": "0.35",
                    "bestBid": "0.34",
                    "bestAsk": "0.36",
                    "spread": 0.02,
                    "volume": "1250000.50",
                    "onchainMarketId": "0xdef456..."
                }
            ],
            "syncedAt": "2026-01-31T12:00:00Z"
        }
    ],
    "meta": {
        "total": 150,
        "limit": 20,
        "offset": 0
    }
}
```

**请求示例**:

```bash
# 获取前20个热门市场
curl "http://localhost:3001/api/v1/markets?limit=20&sortBy=volume"

# 搜索crypto相关市场
curl "http://localhost:3001/api/v1/markets?tag=crypto&limit=10"

# 关键词搜索
curl "http://localhost:3001/api/v1/markets?search=bitcoin&limit=10"
```

---

### 2.2. 获取市场详情

获取单个事件的完整信息，包含所有子市场、Polymarket 订单簿数据。

```
GET /api/v1/markets/:eventId
```

**Path Parameters**:

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `eventId` | string | 事件ID (Polymarket event ID) |

**Success Response (200 OK)**:

```json
{
    "success": true,
    "data": {
        "eventId": "12345",
        "slug": "will-ethereum-reach-5000",
        "title": "Will Ethereum reach $5,000 by end of 2026?",
        "description": "This market resolves to 'Yes' if the price of Ethereum (ETH) on CoinGecko reaches $5,000 at any point before December 31, 2026, 11:59 PM ET. Otherwise, this market resolves to 'No'.",
        "resolutionSource": "https://www.coingecko.com/en/coins/ethereum",
        "imageUrl": "https://...",
        "iconUrl": "https://...",
        "startDate": "2026-01-15T00:00:00Z",
        "endDate": "2026-12-31T23:59:59Z",
        "active": true,
        "closed": false,
        "featured": true,
        "volume": 1250000.50,
        "volume24h": 45678.90,
        "liquidity": 234567.89,
        "openInterest": 567890.12,
        "tags": [
            {"slug": "crypto", "label": "Crypto"}
        ],
        "markets": [
            {
                "marketId": "67890",
                "conditionId": "0xabc123...",
                "question": "Will Ethereum reach $5,000 by end of 2026?",
                "outcomes": ["Yes", "No"],
                "outcomePrices": ["0.35", "0.65"],
                "lastTradePrice": "0.35",
                "bestBid": "0.34",
                "bestAsk": "0.36",
                "spread": 0.02,
                "volume": "1250000.50",
                "clobTokenIds": [
                    "YES_TOKEN_ID",
                    "NO_TOKEN_ID"
                ],
                "onchainMarketId": "0xdef456...",
                "resolutionStatus": 0,
                "acceptingOrders": true,
                "polymarketOrderBook": {
                    "yes": {
                        "bids": [
                            {"price": "0.34", "size": "5000.00"},
                            {"price": "0.33", "size": "12000.00"},
                            {"price": "0.32", "size": "8000.00"},
                            {"price": "0.31", "size": "15000.00"},
                            {"price": "0.30", "size": "20000.00"}
                        ],
                        "asks": [
                            {"price": "0.36", "size": "3000.00"},
                            {"price": "0.37", "size": "8000.00"},
                            {"price": "0.38", "size": "6000.00"},
                            {"price": "0.39", "size": "10000.00"},
                            {"price": "0.40", "size": "18000.00"}
                        ]
                    },
                    "no": {
                        "bids": [
                            {"price": "0.63", "size": "4000.00"},
                            {"price": "0.62", "size": "9000.00"}
                        ],
                        "asks": [
                            {"price": "0.66", "size": "2500.00"},
                            {"price": "0.67", "size": "7000.00"}
                        ]
                    },
                    "hash": "0x...",
                    "timestamp": "2026-01-31T12:00:00Z"
                }
            }
        ],
        "syncedAt": "2026-01-31T12:00:00Z"
    }
}
```

**Error Response (404)**:

```json
{
    "success": false,
    "error": {
        "code": "EVENT_NOT_FOUND",
        "message": "Event with id '99999' not found"
    }
}
```

---

### 2.3. 获取单个子市场的订单簿

获取指定子市场的实时订单簿数据（来自 Polymarket CLOB API）。

```
GET /api/v1/markets/:eventId/orderbook/:marketId
```

**Path Parameters**:

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `eventId` | string | 事件ID |
| `marketId` | string | 子市场ID (Polymarket market ID) |

**Query Parameters**:

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| `depth` | integer | 否 | 20 | 订单簿深度 (每侧最大条目数, 1-50) |

**Success Response (200 OK)**:

```json
{
    "success": true,
    "data": {
        "marketId": "67890",
        "conditionId": "0xabc123...",
        "onchainMarketId": "0xdef456...",
        "yes": {
            "bids": [
                {"price": "0.34", "size": "5000.00"},
                {"price": "0.33", "size": "12000.00"}
            ],
            "asks": [
                {"price": "0.36", "size": "3000.00"},
                {"price": "0.37", "size": "8000.00"}
            ],
            "bestBid": "0.34",
            "bestAsk": "0.36",
            "spread": "0.02",
            "midpoint": "0.35"
        },
        "no": {
            "bids": [
                {"price": "0.63", "size": "4000.00"},
                {"price": "0.62", "size": "9000.00"}
            ],
            "asks": [
                {"price": "0.66", "size": "2500.00"},
                {"price": "0.67", "size": "7000.00"}
            ],
            "bestBid": "0.63",
            "bestAsk": "0.66",
            "spread": "0.03",
            "midpoint": "0.645"
        },
        "hash": "0x...",
        "fetchedAt": "2026-01-31T12:00:30Z"
    }
}
```

---

### 2.4. 获取市场价格历史

获取指定子市场 outcome 的价格历史数据，用于前端绘制价格图表。

```
GET /api/v1/markets/:eventId/price-history/:marketId
```

**Path Parameters**:

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `eventId` | string | 事件ID |
| `marketId` | string | 子市场ID |

**Query Parameters**:

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| `interval` | string | 否 | `1d` | 时间间隔: `1h`, `1d`, `1w`, `max` |
| `outcome` | string | 否 | `yes` | 哪个outcome的价格: `yes`, `no` |

**Success Response (200 OK)**:

```json
{
    "success": true,
    "data": {
        "marketId": "67890",
        "outcome": "yes",
        "interval": "1d",
        "history": [
            {"timestamp": 1706572800, "price": 0.32},
            {"timestamp": 1706659200, "price": 0.34},
            {"timestamp": 1706745600, "price": 0.33},
            {"timestamp": 1706832000, "price": 0.35}
        ]
    }
}
```

---

## 3. AI 分析接口 (Analysis)

### 3.1. 请求AI分析

为指定市场触发一个异步 AI 分析任务。后端调用 0G Compute Network 进行推理。

```
POST /api/v1/markets/:eventId/analyze
```

**Path Parameters**:

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `eventId` | string | 事件ID |

**Request Body**:

```json
{
    "marketId": "67890"
}
```

> 如果事件只有一个子市场，`marketId` 可以省略，默认分析第一个子市场。

**Success Response (202 Accepted)**:

```json
{
    "success": true,
    "data": {
        "taskId": "a1b2c3d4-e5f6-7890-abcd-1234567890ab",
        "marketId": "67890",
        "status": "pending",
        "createdAt": "2026-01-31T12:00:00Z"
    }
}
```

**Error Responses**:

```json
// 404 - 市场不存在
{
    "success": false,
    "error": {
        "code": "MARKET_NOT_FOUND",
        "message": "Market '67890' not found in event '12345'"
    }
}

// 429 - 该市场的分析请求过于频繁
{
    "success": false,
    "error": {
        "code": "ANALYSIS_RATE_LIMITED",
        "message": "An analysis for this market is already in progress. Please wait for it to complete."
    }
}
```

---

### 3.2. 查询AI分析结果

根据任务 ID 查询 AI 分析的进度和结果。前端应轮询此接口，建议间隔 3 秒。

```
GET /api/v1/analysis/:taskId
```

**Path Parameters**:

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `taskId` | string (UUID) | 分析任务ID |

**Success Response - 进行中 (200 OK)**:

```json
{
    "success": true,
    "data": {
        "taskId": "a1b2c3d4-e5f6-7890-abcd-1234567890ab",
        "marketId": "67890",
        "status": "processing",
        "createdAt": "2026-01-31T12:00:00Z",
        "updatedAt": "2026-01-31T12:00:05Z"
    }
}
```

**Success Response - 完成 (200 OK)**:

```json
{
    "success": true,
    "data": {
        "taskId": "a1b2c3d4-e5f6-7890-abcd-1234567890ab",
        "marketId": "67890",
        "status": "completed",
        "prediction": "YES",
        "confidence": 72,
        "proArguments": [
            {
                "argument": "Current ETH price momentum shows a strong upward trend, with a 40% increase in the last 3 months.",
                "confidence": 80
            },
            {
                "argument": "Institutional adoption of Ethereum continues to accelerate with multiple ETF approvals.",
                "confidence": 75
            },
            {
                "argument": "The upcoming Ethereum protocol upgrades are expected to improve scalability and reduce gas fees.",
                "confidence": 65
            }
        ],
        "conArguments": [
            {
                "argument": "Global macroeconomic uncertainty and potential regulatory crackdowns could suppress crypto prices.",
                "confidence": 60
            },
            {
                "argument": "Historical data shows that $5,000 has been a strong psychological resistance level.",
                "confidence": 55
            },
            {
                "argument": "Competition from Layer 2 solutions and alternative L1 chains may divert capital.",
                "confidence": 45
            }
        ],
        "reasoning": "After analyzing both pro and con arguments, the positive momentum indicators and institutional adoption signals outweigh the bearish concerns. While macro risks exist, the fundamental trajectory supports a moderate probability of reaching $5,000. Key factor: institutional ETF inflows have historically preceded significant price movements.",
        "ogStorageKey": "analysis:67890:a1b2c3d4-e5f6-7890-abcd-1234567890ab",
        "createdAt": "2026-01-31T12:00:00Z",
        "completedAt": "2026-01-31T12:00:45Z"
    }
}
```

**Success Response - 失败 (200 OK)**:

```json
{
    "success": true,
    "data": {
        "taskId": "a1b2c3d4-e5f6-7890-abcd-1234567890ab",
        "marketId": "67890",
        "status": "failed",
        "errorMessage": "AI inference service temporarily unavailable. Please try again later.",
        "createdAt": "2026-01-31T12:00:00Z",
        "updatedAt": "2026-01-31T12:01:00Z"
    }
}
```

---

### 3.3. 获取市场的分析历史

获取指定市场的所有历史分析结果列表。

```
GET /api/v1/markets/:eventId/analyses
```

**Path Parameters**:

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `eventId` | string | 事件ID |

**Query Parameters**:

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| `marketId` | string | 否 | - | 筛选特定子市场 |
| `status` | string | 否 | - | 筛选状态: `completed`, `failed` |
| `limit` | integer | 否 | 10 | 每页数量 (1-50) |

**Success Response (200 OK)**:

```json
{
    "success": true,
    "data": [
        {
            "taskId": "a1b2c3d4-...",
            "marketId": "67890",
            "status": "completed",
            "prediction": "YES",
            "confidence": 72,
            "createdAt": "2026-01-31T12:00:00Z"
        },
        {
            "taskId": "b2c3d4e5-...",
            "marketId": "67890",
            "status": "completed",
            "prediction": "YES",
            "confidence": 68,
            "createdAt": "2026-01-30T08:00:00Z"
        }
    ],
    "meta": {
        "total": 2,
        "limit": 10,
        "offset": 0
    }
}
```

---

## 4. 交易历史接口 (Trades)

### 4.1. 获取用户交易历史

从 0G Storage KV 中查询指定用户的交易记录。交易记录在链上交易确认后由后端自动存证。

```
GET /api/v1/trades/:userAddress
```

**Path Parameters**:

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `userAddress` | string | 用户钱包地址 (0x..., 42字符) |

**Query Parameters**:

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| `limit` | integer | 否 | 50 | 每页数量 (1-200) |
| `offset` | integer | 否 | 0 | 偏移量 |
| `marketId` | string | 否 | - | 筛选特定市场 |
| `status` | string | 否 | - | 筛选状态: `pending`, `filled`, `cancelled` |
| `sortBy` | string | 否 | `createdAt` | 排序: `createdAt`, `amount` |

**Success Response (200 OK)**:

```json
{
    "success": true,
    "data": [
        {
            "tradeId": "e5f6a7b8-...",
            "userAddress": "0x1234...abcd",
            "marketId": "67890",
            "eventId": "12345",
            "marketTitle": "Will Ethereum reach $5,000 by end of 2026?",
            "outcome": "YES",
            "price": 35,
            "amount": 100.00,
            "tradeType": "buy",
            "status": "filled",
            "onchainOrderId": 42,
            "txHash": "0xabc123...def456",
            "ogStorageKey": "trade:0x1234...abcd:42",
            "ogRootHash": "0xfed789...",
            "createdAt": "2026-01-31T10:30:00Z",
            "updatedAt": "2026-01-31T10:30:15Z"
        }
    ],
    "meta": {
        "total": 15,
        "limit": 50,
        "offset": 0
    },
    "storageProvider": "0G Storage KV"
}
```

**Error Response (400)**:

```json
{
    "success": false,
    "error": {
        "code": "INVALID_PARAMS",
        "message": "Invalid Ethereum address format"
    }
}
```

---

### 4.2. 记录交易 (内部接口)

记录一笔新的交易到数据库和 0G Storage。此接口由后端内部调用（监听链上事件时触发），不对外暴露。

```
POST /api/v1/internal/trades
```

> **注意**: 此接口仅限内部调用。实际实现中，交易记录由后端监听 TradingHub 合约的 `OrderPlaced` / `OrderMatched` 事件后自动写入。

**Request Body**:

```json
{
    "userAddress": "0x1234...abcd",
    "marketId": "67890",
    "onchainOrderId": 42,
    "outcome": 1,
    "price": 35,
    "amount": 100.00,
    "tradeType": "buy",
    "txHash": "0xabc123...def456"
}
```

---

## 5. 市场快照接口 (Snapshots)

### 5.1. 获取市场快照列表

获取指定市场的历史快照列表。快照数据存储在 0G 文件存储中。

```
GET /api/v1/markets/:eventId/snapshots
```

**Path Parameters**:

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `eventId` | string | 事件ID |

**Query Parameters**:

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| `marketId` | string | 否 | - | 筛选特定子市场 |
| `limit` | integer | 否 | 10 | 每页数量 (1-50) |
| `startDate` | string | 否 | - | 起始时间 (ISO8601) |
| `endDate` | string | 否 | - | 结束时间 (ISO8601) |

**Success Response (200 OK)**:

```json
{
    "success": true,
    "data": [
        {
            "snapshotId": "c3d4e5f6-...",
            "snapshotType": "full",
            "marketId": null,
            "ogRootHash": "0xaaa111...",
            "marketCount": 45,
            "createdAt": "2026-01-31T12:00:00Z"
        },
        {
            "snapshotId": "d4e5f6a7-...",
            "snapshotType": "full",
            "marketId": null,
            "ogRootHash": "0xbbb222...",
            "marketCount": 44,
            "createdAt": "2026-01-31T11:30:00Z"
        }
    ],
    "meta": {
        "total": 48,
        "limit": 10,
        "offset": 0
    },
    "storageProvider": "0G Storage File"
}
```

---

### 5.2. 下载快照内容

通过 0G Storage rootHash 下载快照的完整内容。

```
GET /api/v1/snapshots/:rootHash
```

**Path Parameters**:

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `rootHash` | string | 0G Storage 文件的 Merkle Root Hash |

**Success Response (200 OK)**:

```json
{
    "success": true,
    "data": {
        "snapshotId": "snapshot-1706702400000",
        "timestamp": 1706702400000,
        "marketCount": 45,
        "markets": [
            {
                "eventId": "12345",
                "marketId": "67890",
                "conditionId": "0xabc...",
                "question": "Will Ethereum reach $5,000?",
                "outcomePrices": ["0.35", "0.65"],
                "volume": "1250000.50",
                "orderBook": {
                    "yes": {
                        "bids": [{"price": "0.34", "size": "5000"}],
                        "asks": [{"price": "0.36", "size": "3000"}]
                    },
                    "no": {
                        "bids": [{"price": "0.63", "size": "4000"}],
                        "asks": [{"price": "0.66", "size": "2500"}]
                    }
                }
            }
        ]
    },
    "storageProvider": "0G Storage File",
    "rootHash": "0xaaa111...",
    "verified": true
}
```

---

## 6. 系统状态接口 (Health)

### 6.1. 服务健康检查

```
GET /api/v1/health
```

**Success Response (200 OK)**:

```json
{
    "success": true,
    "data": {
        "status": "healthy",
        "version": "1.0.0",
        "uptime": 86400,
        "services": {
            "database": {
                "status": "connected",
                "latency": 2
            },
            "polymarketGamma": {
                "status": "reachable",
                "lastSync": "2026-01-31T12:00:00Z",
                "latency": 120
            },
            "polymarketClob": {
                "status": "reachable",
                "latency": 85
            },
            "ogStorage": {
                "status": "connected",
                "latency": 200
            },
            "ogCompute": {
                "status": "connected"
            },
            "ogChain": {
                "status": "connected",
                "blockNumber": 12345678,
                "latency": 50
            }
        },
        "sync": {
            "totalEvents": 150,
            "totalMarkets": 320,
            "activeMarkets": 280,
            "lastEventSync": "2026-01-31T12:00:00Z",
            "lastOrderBookRefresh": "2026-01-31T12:00:30Z",
            "lastSnapshotUpload": "2026-01-31T11:30:00Z"
        }
    }
}
```

### 6.2. 获取同步统计

```
GET /api/v1/stats
```

**Success Response (200 OK)**:

```json
{
    "success": true,
    "data": {
        "markets": {
            "total": 320,
            "active": 280,
            "closed": 35,
            "resolved": 5
        },
        "storage": {
            "totalTradesStored": 1250,
            "totalAnalysesStored": 89,
            "totalSnapshots": 48,
            "lastSnapshotAt": "2026-01-31T11:30:00Z"
        },
        "oracle": {
            "totalResolved": 5,
            "lastResolvedAt": "2026-01-30T15:00:00Z"
        }
    }
}
```

---

## 7. 接口一览表

| # | 方法 | 路径 | 描述 | 优先级 |
| :--- | :--- | :--- | :--- | :--- |
| 1 | GET | `/api/v1/markets` | 获取市场列表 | P0 |
| 2 | GET | `/api/v1/markets/:eventId` | 获取市场详情 + 订单簿 | P0 |
| 3 | GET | `/api/v1/markets/:eventId/orderbook/:marketId` | 获取订单簿 | P0 |
| 4 | GET | `/api/v1/markets/:eventId/price-history/:marketId` | 获取价格历史 | P1 |
| 5 | POST | `/api/v1/markets/:eventId/analyze` | 请求AI分析 | P0 |
| 6 | GET | `/api/v1/analysis/:taskId` | 查询AI分析结果 | P0 |
| 7 | GET | `/api/v1/markets/:eventId/analyses` | 市场的分析历史 | P2 |
| 8 | GET | `/api/v1/trades/:userAddress` | 用户交易历史 | P1 |
| 9 | GET | `/api/v1/markets/:eventId/snapshots` | 市场快照列表 | P2 |
| 10 | GET | `/api/v1/snapshots/:rootHash` | 下载快照内容 | P2 |
| 11 | GET | `/api/v1/health` | 服务健康检查 | P0 |
| 12 | GET | `/api/v1/stats` | 同步统计 | P2 |

---

## 8. 前端调用示例

### 8.1. 页面数据流映射

```
首页 (Market List Page)
└── GET /api/v1/markets?limit=20&sortBy=volume
    → 渲染 MarketCard 列表

市场详情页 (Market Detail Page)
├── GET /api/v1/markets/:eventId
│   → 渲染市场信息 + Polymarket订单簿
├── GET /api/v1/markets/:eventId/orderbook/:marketId  (每30秒轮询)
│   → 刷新订单簿组件
├── GET /api/v1/markets/:eventId/price-history/:marketId?interval=1d
│   → 渲染价格走势图
├── POST /api/v1/markets/:eventId/analyze
│   → 触发AI分析
└── GET /api/v1/analysis/:taskId  (每3秒轮询直到完成)
    → 渲染AI分析结果

Portfolio 页面
├── GET /api/v1/trades/:userAddress
│   → 渲染交易历史列表 (TradeHistory组件)
└── 链上直接调用 TradingHub 合约视图函数
    → 渲染余额、持仓、活动订单
```

### 8.2. 前端轮询策略建议

| 数据 | 轮询间隔 | 触发条件 |
| :--- | :--- | :--- |
| 市场列表 | 60秒 | 自动 |
| 订单簿 | 30秒 | 在市场详情页时 |
| AI分析进度 | 3秒 | 发起分析后，直到状态变为 completed/failed |
| 用户交易历史 | 不轮询 | 用户进入 Portfolio 页面时请求一次 |
| 价格历史 | 不轮询 | 切换 interval 时请求一次 |

---

## 9. TypeScript 类型定义

以下类型定义供前后端共享使用：

```typescript
// ============ 通用 ============

interface ApiResponse<T> {
    success: true;
    data: T;
    meta?: PaginationMeta;
    storageProvider?: string;
}

interface ApiError {
    success: false;
    error: {
        code: string;
        message: string;
    };
}

interface PaginationMeta {
    total: number;
    limit: number;
    offset: number;
}

// ============ 市场 ============

interface EventSummary {
    eventId: string;
    slug: string;
    title: string;
    description: string;
    imageUrl: string | null;
    iconUrl: string | null;
    startDate: string;
    endDate: string;
    active: boolean;
    closed: boolean;
    featured: boolean;
    volume: number;
    volume24h: number;
    liquidity: number;
    openInterest: number;
    tags: Tag[];
    markets: MarketSummary[];
    syncedAt: string;
}

interface Tag {
    slug: string;
    label: string;
}

interface MarketSummary {
    marketId: string;
    conditionId: string;
    question: string;
    outcomes: string[];
    outcomePrices: string[];
    lastTradePrice: string;
    bestBid: string;
    bestAsk: string;
    spread: number;
    volume: string;
    onchainMarketId: string;
}

interface MarketDetail extends MarketSummary {
    clobTokenIds: string[];
    resolutionStatus: 0 | 1 | 2; // 0:未解析 1:NO胜 2:YES胜
    acceptingOrders: boolean;
    polymarketOrderBook: OrderBookData;
}

interface EventDetail extends Omit<EventSummary, 'markets'> {
    resolutionSource: string | null;
    markets: MarketDetail[];
}

// ============ 订单簿 ============

interface OrderBookEntry {
    price: string;
    size: string;
}

interface OrderBookSide {
    bids: OrderBookEntry[];
    asks: OrderBookEntry[];
    bestBid: string;
    bestAsk: string;
    spread: string;
    midpoint: string;
}

interface OrderBookData {
    yes: OrderBookSide;
    no: OrderBookSide;
    hash: string;
    timestamp: string;
}

// ============ AI 分析 ============

interface AnalysisArgument {
    argument: string;
    confidence: number;
}

interface AnalysisTask {
    taskId: string;
    marketId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    prediction?: 'YES' | 'NO';
    confidence?: number;
    proArguments?: AnalysisArgument[];
    conArguments?: AnalysisArgument[];
    reasoning?: string;
    ogStorageKey?: string;
    errorMessage?: string;
    createdAt: string;
    completedAt?: string;
    updatedAt?: string;
}

// ============ 交易记录 ============

interface TradeRecord {
    tradeId: string;
    userAddress: string;
    marketId: string;
    eventId: string;
    marketTitle: string;
    outcome: 'YES' | 'NO';
    price: number;
    amount: number;
    tradeType: 'buy' | 'sell';
    status: 'pending' | 'filled' | 'cancelled';
    onchainOrderId: number;
    txHash: string;
    ogStorageKey: string;
    ogRootHash: string;
    createdAt: string;
    updatedAt: string;
}

// ============ 快照 ============

interface SnapshotIndex {
    snapshotId: string;
    snapshotType: 'full' | 'single_market';
    marketId: string | null;
    ogRootHash: string;
    marketCount: number;
    createdAt: string;
}

// ============ 价格历史 ============

interface PricePoint {
    timestamp: number;
    price: number;
}

interface PriceHistory {
    marketId: string;
    outcome: string;
    interval: string;
    history: PricePoint[];
}
```

# OG Predict - 预测市场聚合交易终端

基于 **0G Network** 构建的预测市场聚合交易终端 Demo。从 Polymarket 聚合预测事件与订单簿数据，利用 0G Compute Network 进行 AI 分析，通过 0G Storage 实现去中心化数据持久化，用户可在 0G 测试网上完成交易。

## 项目架构

```
┌─────────────┐     ┌─────────────────────────────────────────┐
│   Frontend   │────▶│              Backend API                 │
│  React+Vite  │ REST│         Express + TypeScript              │
└─────────────┘     └──────┬─────────┬─────────┬──────────────┘
                           │         │         │
                    ┌──────▼───┐ ┌───▼────┐ ┌──▼───────────┐
                    │Polymarket│ │  0G    │ │  0G Compute  │
                    │ Gamma API│ │Storage │ │   Network    │
                    │ CLOB API │ │ KV+File│ │  (AI推理)    │
                    └──────────┘ └────────┘ └──────────────┘
                                     │
                              ┌──────▼──────┐
                              │  0G Testnet  │
                              │  EVM Chain   │
                              │ TradingHub   │
                              └─────────────┘
```

## 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| **Monorepo** | npm workspaces | 多包管理 |
| **前端** | React 19 + Vite 6 + TypeScript | SPA 应用 |
| **前端样式** | TailwindCSS 3.4 | 工具类样式 |
| **前端状态** | Zustand + React Query | 状态管理 + 服务端缓存 |
| **前端图表** | lightweight-charts + recharts | K线 / 图表 |
| **后端** | Express 4 + TypeScript | REST API |
| **数据库** | PostgreSQL + Prisma ORM | 数据持久化 |
| **日志** | Pino | 结构化日志 |
| **校验** | Zod | 请求参数校验 |
| **链交互** | ethers.js v6 | 合约调用 |
| **0G 存储** | @0glabs/0g-ts-sdk | KV / File 存储 |
| **0G AI** | @0glabs/0g-serving-broker + OpenAI SDK | AI 推理 |
| **定时任务** | node-cron | 数据同步调度 |

## 目录结构

```
0G-hack/
├── package.json                  # Monorepo 根配置
├── tsconfig.base.json            # 共享 TypeScript 配置
├── .gitignore
│
├── packages/shared/              # 共享类型定义包 (@og-predict/shared)
│   └── src/
│       ├── types/                # API / Market / Analysis / Trade / Storage 类型
│       └── constants/            # Polymarket / 0G 网络端点常量
│
├── backend/                      # 后端服务 (@og-predict/backend)
│   ├── prisma/
│   │   └── schema.prisma         # 数据库模型 (5张表)
│   └── src/
│       ├── index.ts              # 入口 (启动 HTTP + 定时任务)
│       ├── app.ts                # Express 应用装配
│       ├── config/               # 环境变量配置
│       ├── middleware/            # 错误处理 / 请求日志 / Zod校验
│       ├── routes/               # API 路由 (markets/analysis/trades/snapshots/health)
│       ├── services/
│       │   ├── polymarket/       # Polymarket Gamma + CLOB 客户端
│       │   ├── sync/             # 数据同步 + 订单簿缓存 + 价格更新
│       │   ├── oracle/           # Oracle 结算服务
│       │   ├── storage/          # 0G KV + File Storage 封装
│       │   ├── ai/               # 0G Compute AI 分析服务
│       │   └── contract/         # TradingHub 合约交互
│       └── utils/                # Logger / Retry
│
├── frontend/                     # 前端应用 (@og-predict/frontend)
│   └── src/
│       ├── api/                  # Axios API 客户端封装
│       ├── components/
│       │   ├── common/           # Loading / ErrorMessage / ConnectButton
│       │   ├── layout/           # MainLayout / Header
│       │   ├── market/           # EventCard / EventList / OrderBook / PriceChart
│       │   ├── trade/            # TradePanel / TradeHistory
│       │   ├── ai/               # AnalysisPanel
│       │   └── portfolio/        # PositionList
│       ├── hooks/                # React Query hooks (useEvents / useOrderBook 等)
│       ├── pages/                # HomePage / MarketDetailPage / PortfolioPage
│       ├── stores/               # Zustand (wallet-store / market-store)
│       ├── styles/               # TailwindCSS 全局样式
│       ├── types/                # 类型补充 (window.ethereum)
│       └── utils/                # 格式化工具函数
│
└── docs/                         # 项目文档
```

## 快速开始

### 前置要求

- **Node.js** >= 18.x
- **npm** >= 9.x
- **PostgreSQL** >= 14
- **MetaMask** 浏览器插件（前端钱包连接）

### 1. 克隆仓库 & 安装依赖

```bash
git clone <repo-url>
cd 0G-hack
npm install
```

`npm install` 会自动安装所有 workspace（`packages/shared`、`backend`、`frontend`）的依赖。

### 2. 构建共享包

后端和前端都依赖 `@og-predict/shared`，首次运行前必须先构建：

```bash
npm run build --workspace=packages/shared
```

或使用开发模式自动监听变更：

```bash
npm run dev --workspace=packages/shared
```

### 3. 配置环境变量

```bash
cp backend/.env.example backend/.env
```

编辑 `backend/.env`，填入以下配置：

| 变量 | 说明 | 是否必填 |
|------|------|---------|
| `DATABASE_URL` | PostgreSQL 连接字符串 | 必填 |
| `OG_RPC_URL` | 0G 测试网 RPC | 已有默认值 |
| `STORAGE_PRIVATE_KEY` | 0G Storage 写入钱包私钥 | 用到存储时必填 |
| `OG_KV_STREAM_ID` | 0G KV Storage Stream ID | 用到 KV 时必填 |
| `OG_KV_NODE_RPC` | 0G KV 节点地址 | 用到 KV 时必填 |
| `COMPUTE_PRIVATE_KEY` | 0G Compute Network 钱包私钥 | 用到 AI 时必填 |
| `ORACLE_PRIVATE_KEY` | Oracle 结算钱包私钥 | 用到 Oracle 时必填 |
| `DEMO_USDC_ADDRESS` | DemoUSDC 合约地址 | 合约部署后填入 |
| `TRADING_HUB_ADDRESS` | TradingHub 合约地址 | 合约部署后填入 |

> **安全提醒**：`.env` 文件已在 `.gitignore` 中，切勿将私钥提交到 Git。

### 4. 初始化数据库

```bash
# 进入 backend 目录
cd backend

# 生成 Prisma Client
npx prisma generate

# 将 schema 推送到数据库（开发阶段推荐）
npx prisma db push

# 或使用 migration（正式环境推荐）
npx prisma migrate dev --name init

# 可选：打开 Prisma Studio 查看数据
npx prisma studio
```

### 5. 启动开发服务

**同时启动前后端（推荐）：**

```bash
# 在项目根目录
npm run dev
```

**分别启动：**

```bash
# 终端 1 - 后端 (localhost:3001)
npm run dev:backend

# 终端 2 - 前端 (localhost:5173)
npm run dev:frontend
```

前端 Vite 已配置代理，所有 `/api` 请求会转发到后端 `localhost:3001`。

### 6. 构建生产版本

```bash
npm run build
```

会按顺序构建：shared → backend → frontend。

## 数据库模型

5 张核心表，定义在 [backend/prisma/schema.prisma](backend/prisma/schema.prisma)：

| 表名 | 说明 |
|------|------|
| `events` | Polymarket 预测事件 |
| `markets` | 子市场（每个事件含多个 Yes/No 市场） |
| `price_history` | 市场价格时序数据 |
| `analysis_tasks` | AI 分析任务及结果 |
| `trade_records` | 用户链上交易记录 |

## API 端点一览

后端提供 RESTful API，基础路径 `/api/v1`：

### Markets

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/markets` | 获取事件列表（支持分页、标签筛选、排序） |
| GET | `/markets/:eventId` | 获取事件详情（含子市场 + 订单簿） |
| GET | `/markets/:eventId/orderbook/:marketId` | 获取子市场订单簿 |
| GET | `/markets/:eventId/price-history/:marketId` | 获取价格历史 |
| POST | `/markets/:eventId/analyze` | 触发 AI 分析（Body: `{ marketId }`） |
| GET | `/markets/:eventId/analyses` | 获取分析历史（可用 `marketId` 过滤） |
| GET | `/markets/:eventId/snapshots` | 获取市场快照列表（待实现） |

### Analysis

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/analysis/:taskId` | 查询单个 AI 分析结果 |

### Trades

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/trades/:userAddress` | 查询用户交易记录 |

### Snapshots

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/snapshots/:rootHash` | 下载快照内容（待实现） |

### Health

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查 |

> 完整的请求/响应格式请参考 [后端API接口设计文档.md](后端API接口设计文档.md)。

## 后端服务模块说明

### polymarket/ — Polymarket 数据客户端

- **GammaClient**：对接 `gamma-api.polymarket.com`，获取事件和市场元数据，无需鉴权
- **ClobClient**：对接 `clob.polymarket.com`，获取订单簿、实时价格，注意速率限制（`/book` 接口 50次/10秒）

### sync/ — 数据同步

- **DataSyncer**：定时全量/增量同步事件和市场数据到 PostgreSQL
- **OrderBookCache**：内存缓存订单簿，热门市场 30s TTL，冷门市场 120s TTL
- **PriceUpdater**：定时更新市场价格，写入 `price_history` 表

### oracle/ — Oracle 结算

监控 Polymarket 已结算的市场，自动调用 `TradingHub.resolveMarket()` 在 0G 链上完成结算。

### storage/ — 0G Storage 集成

- **OgKvClient**：KV 存储，保存交易记录和 AI 分析结果
  - Key 规范：`trade:{address}:{orderId}`, `analysis:{marketId}:{taskId}`
- **OgFileClient**：文件存储，上传/下载市场快照
- **SnapshotService**：定时快照市场数据，上传到 0G File Storage

### ai/ — 0G Compute AI 分析

- **OgComputeClient**：封装 0G Serving Broker SDK，提供 OpenAI 兼容的 chat completion
- **AiService**：管理分析任务生命周期（创建 → 执行 → 存储结果）
- **prompts.ts**：AI 分析提示词模板

### contract/ — 链上合约交互

**TradingHubClient**：与 TradingHub 合约交互（ERC1155 份额 + 链上订单簿）。

## 前端页面说明

| 页面 | 路由 | 功能 |
|------|------|------|
| **HomePage** | `/` | 市场列表、标签筛选 |
| **MarketDetailPage** | `/market/:eventId` | 价格图表 + 订单簿 + 交易面板 + AI 分析 |
| **PortfolioPage** | `/portfolio` | 用户持仓 + 交易历史 |

### 前端关键约定

- **API 调用**：统一通过 `src/api/` 封装，返回 `ApiResponse<T>` 类型
- **数据请求**：使用 React Query hooks（`src/hooks/`），自动管理缓存和轮询
- **状态管理**：Zustand stores，分为 `wallet-store`（钱包状态）和 `market-store`（筛选状态）
- **路径别名**：`@/` 映射到 `src/`，例如 `import { useEvents } from '@/hooks'`

## 0G 集成要点

本项目使用了 0G Network 的两大核心能力：

### 0G Storage（去中心化存储）

| 存储类型 | 用途 | SDK |
|---------|------|-----|
| **KV Storage** | 交易记录、AI 分析结果 | `Batcher` + `KvClient` |
| **File Storage** | 市场快照 JSON | `ZgFile` + `Indexer` |

参考文档：https://docs.0g.ai/developer-hub/building-on-0g/storage/sdk

### 0G Compute Network（AI 推理）

通过 Broker SDK 调用链上 AI 模型服务：

1. `createBroker(wallet)` 创建 broker 实例
2. `broker.inference.listService()` 获取可用模型
3. `broker.inference.getRequestHeaders()` 获取一次性鉴权头
4. 使用 OpenAI SDK 兼容接口发送请求

参考文档：https://docs.0g.ai/developer-hub/building-on-0g/compute-network/sdk

## 开发约定

### 类型共享

前后端共用 `@og-predict/shared` 包中定义的类型。修改类型后需重新构建：

```bash
npm run build --workspace=packages/shared
```

或保持 `npm run dev --workspace=packages/shared` 在后台运行。

### API 响应格式

所有 API 统一返回格式：

```typescript
// 成功
{ "success": true, "data": T }

// 带分页
{ "success": true, "data": T, "pagination": { "total": 100, "limit": 20, "offset": 0, "hasMore": true } }

// 失败
{ "success": false, "error": { "code": "NOT_FOUND", "message": "Market not found" } }
```

### Git 分支规范

建议使用以下分支策略：

```
main              # 稳定版本
├── dev           # 开发集成分支
├── feat/xxx      # 功能开发
├── fix/xxx       # Bug 修复
└── docs/xxx      # 文档更新
```

### 代码风格

- TypeScript strict mode
- 使用 ESM 模块
- 后端使用 Pino 结构化日志，避免使用 `console.log`
- 前端组件使用函数式组件 + hooks

## 团队分工参考

| 角色 | 职责范围 | 主要文件 |
|------|---------|---------|
| **成员A** - 智能合约 | Solidity 合约开发 (DemoUSDC + TradingHub) | `contracts/` |
| **成员B** - 前端 | React 页面、组件、样式 | `frontend/src/` |
| **成员C** - 0G 集成 | 0G Storage + Compute 接入 | `backend/src/services/storage/`, `backend/src/services/ai/` |
| **成员D** - 后端数据 | Polymarket API 对接、数据同步、Oracle | `backend/src/services/polymarket/`, `sync/`, `oracle/` |

## 常用命令速查

```bash
# === 安装 & 构建 ===
npm install                                   # 安装所有依赖
npm run build                                 # 构建全部（shared → backend → frontend）
npm run build --workspace=packages/shared     # 仅构建共享包

# === 开发 ===
npm run dev                                   # 同时启动前后端
npm run dev:backend                           # 仅启动后端 (port 3001)
npm run dev:frontend                          # 仅启动前端 (port 5173)

# === 数据库 ===
cd backend
npx prisma generate                           # 生成 Prisma Client
npx prisma db push                            # 同步 schema 到数据库
npx prisma migrate dev --name <name>          # 创建 migration
npx prisma studio                             # 打开数据库可视化工具

# === 测试 ===
npm run test --workspace=backend              # 后端测试
npm run lint                                  # 全部 lint

# === 其他 ===
npx prisma format                             # 格式化 prisma schema
```

## 参考文档

- [产品需求文档 (PRD)](预测市场聚合交易终端%20-%20产品需求文档%20(PRD).md)
- [后端开发 PRD](后端开发PRD%20-%20Polymarket数据服务.md)
- [后端 API 接口设计](后端API接口设计文档.md)
- [0G Storage SDK 文档](https://docs.0g.ai/developer-hub/building-on-0g/storage/sdk)
- [0G Compute Network 文档](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/sdk)
- [Polymarket API 文档](https://docs.polymarket.com)

## License

Private - Hackathon Project

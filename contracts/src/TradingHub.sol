// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TradingHub
 * @notice 预测市场交易枢纽 — ERC1155 结果代币 + 链上订单簿 + 内置金库
 * @dev 安全措施：ReentrancyGuard, SafeERC20, CEI 模式, Custom Errors
 *
 * 核心机制（Complete Set）：
 *   1 USDC = 1 YES token + 1 NO token
 *   BUY YES @ P1 + BUY NO @ P2 撮合条件: P1 + P2 >= 100
 *   市场结算后: 1 获胜代币 = 1 USDC
 */
contract TradingHub is ERC1155, ERC1155Holder, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============================================================
    //                         常量
    // ============================================================

    uint8 public constant OUTCOME_NO = 0;
    uint8 public constant OUTCOME_YES = 1;
    uint8 public constant SIDE_BUY = 0;
    uint8 public constant SIDE_SELL = 1;

    uint256 public constant MIN_PRICE = 1;
    uint256 public constant MAX_PRICE = 99;
    uint256 public constant PRICE_PRECISION = 100;

    /// @notice 单次下单最多撮合订单数（防止 gas 过高）
    uint256 public constant MAX_MATCHES_PER_ORDER = 20;

    // ============================================================
    //                       不可变量
    // ============================================================

    /// @notice DemoUSDC 代币合约地址
    IERC20 public immutable demoUSDC;

    // ============================================================
    //                       数据结构
    // ============================================================

    enum MarketStatus {
        Active,   // 0 — mapping 默认值，新市场天然 Active
        Resolved  // 1
    }

    struct Market {
        MarketStatus status;
        uint8 winningOutcome;
        uint256 resolvedAt;
    }

    struct Order {
        uint256 id;
        address owner;
        bytes32 marketId;
        uint8 outcome;    // 0=NO, 1=YES
        uint8 side;       // 0=BUY, 1=SELL
        uint256 price;    // 1-99 (百分比)
        uint256 amount;   // 剩余未成交数量 (USDC 精度, 1 token = 1e6)
        uint256 timestamp;
        bool isActive;
    }

    // ============================================================
    //                       状态变量
    // ============================================================

    /// @notice 订单 ID 自增计数器（从 1 开始，0 表示不存在）
    uint256 public nextOrderId = 1;

    /// @notice 用户可用 USDC 余额
    mapping(address => uint256) public userBalances;

    /// @notice 用户锁定的 USDC（挂单中）
    mapping(address => uint256) public lockedBalances;

    /// @notice 订单 ID => 订单详情
    mapping(uint256 => Order) public orders;

    /// @notice 用户 => 订单 ID 列表
    mapping(address => uint256[]) private _userOrderIds;

    /// @notice 市场 ID => 市场状态
    mapping(bytes32 => Market) public markets;

    /// @notice 订单簿: marketId => outcome => side => price => orderId[]
    mapping(bytes32 => mapping(uint8 => mapping(uint8 => mapping(uint256 => uint256[]))))
        private _orderBook;

    /// @notice 订单簿深度: marketId => outcome => side => price => totalAmount
    mapping(bytes32 => mapping(uint8 => mapping(uint8 => mapping(uint256 => uint256))))
        private _orderBookDepth;

    /// @notice 每个市场锁定的总 USDC（Complete Set 支撑）
    mapping(bytes32 => uint256) public marketTotalLocked;

    // ============================================================
    //                       Custom Errors
    // ============================================================

    error InvalidAmount();
    error InvalidPrice();
    error InvalidOutcome();
    error InvalidSide();
    error InsufficientBalance();
    error InsufficientTokens();
    error MarketNotActive();
    error MarketAlreadyResolved();
    error MarketNotResolved();
    error OrderNotFound();
    error OrderNotActive();
    error NotOrderOwner();
    error NoWinningTokens();

    // ============================================================
    //                         事件
    // ============================================================

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event OrderPlaced(
        uint256 indexed orderId,
        address indexed owner,
        bytes32 indexed marketId,
        uint8 outcome,
        uint8 side,
        uint256 price,
        uint256 amount
    );
    event OrderCancelled(uint256 indexed orderId, address indexed owner);
    event OrderMatched(
        bytes32 indexed marketId,
        uint256 buyOrderId,
        uint256 sellOrderId,
        uint256 price,
        uint256 amount,
        address buyer,
        address seller
    );
    event MarketResolved(
        bytes32 indexed marketId,
        uint8 winningOutcome,
        uint256 timestamp
    );
    event Redemption(
        address indexed user,
        bytes32 indexed marketId,
        uint256 tokenAmount,
        uint256 usdcAmount
    );

    // ============================================================
    //                       构造函数
    // ============================================================

    /**
     * @param _demoUSDC DemoUSDC 合约地址
     * @param _oracle   Oracle 地址（作为 owner，可调用 resolveMarket）
     */
    constructor(address _demoUSDC, address _oracle)
        ERC1155("")
        Ownable(_oracle)
    {
        demoUSDC = IERC20(_demoUSDC);
    }

    // ============================================================
    //                    ERC1155 兼容性
    // ============================================================

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, ERC1155Holder)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // ============================================================
    //                    金库功能 (Vault)
    // ============================================================

    /**
     * @notice 存入 USDC 到合约内部余额
     * @param amount 存入数量（USDC 精度，6 位小数）
     */
    function deposit(uint256 amount) external nonReentrant {
        // Checks
        if (amount == 0) revert InvalidAmount();

        // Effects
        userBalances[msg.sender] += amount;

        // Interactions
        demoUSDC.safeTransferFrom(msg.sender, address(this), amount);

        emit Deposit(msg.sender, amount);
    }

    /**
     * @notice 从合约内部余额提取 USDC
     * @param amount 提取数量
     */
    function withdraw(uint256 amount) external nonReentrant {
        // Checks
        if (amount == 0) revert InvalidAmount();
        if (userBalances[msg.sender] < amount) revert InsufficientBalance();

        // Effects
        userBalances[msg.sender] -= amount;

        // Interactions
        demoUSDC.safeTransfer(msg.sender, amount);

        emit Withdraw(msg.sender, amount);
    }

    // ============================================================
    //                     下单 (Order Placement)
    // ============================================================

    /**
     * @notice 下单（买入或卖出结果代币）
     * @param marketId   市场 ID (bytes32, 由 keccak256(conditionId) 生成)
     * @param outcome    结果方向: 0=NO, 1=YES
     * @param side       订单方向: 0=BUY, 1=SELL
     * @param price      价格 1-99 (百分比)
     * @param amount     数量 (代币单位, 1 token = 1e6)
     * @return orderId   生成的订单 ID
     */
    function placeOrder(
        bytes32 marketId,
        uint8 outcome,
        uint8 side,
        uint256 price,
        uint256 amount
    ) external nonReentrant returns (uint256 orderId) {
        // ====== CHECKS ======
        if (markets[marketId].status != MarketStatus.Active) revert MarketNotActive();
        if (price < MIN_PRICE || price > MAX_PRICE) revert InvalidPrice();
        if (amount == 0) revert InvalidAmount();
        if (outcome > 1) revert InvalidOutcome();
        if (side > 1) revert InvalidSide();

        // ====== EFFECTS ======
        orderId = nextOrderId++;

        if (side == SIDE_BUY) {
            // 锁定 USDC: cost = price * amount / 100
            uint256 cost = (price * amount) / PRICE_PRECISION;
            if (cost == 0) revert InvalidAmount();
            if (userBalances[msg.sender] < cost) revert InsufficientBalance();

            userBalances[msg.sender] -= cost;
            lockedBalances[msg.sender] += cost;
        } else {
            // SELL: 锁定代币（转到合约自身）
            uint256 tokenId = getTokenId(marketId, outcome);
            if (balanceOf(msg.sender, tokenId) < amount) revert InsufficientTokens();
            _safeTransferFrom(msg.sender, address(this), tokenId, amount, "");
        }

        // 创建订单
        orders[orderId] = Order({
            id: orderId,
            owner: msg.sender,
            marketId: marketId,
            outcome: outcome,
            side: side,
            price: price,
            amount: amount,
            timestamp: block.timestamp,
            isActive: true
        });

        _userOrderIds[msg.sender].push(orderId);

        emit OrderPlaced(orderId, msg.sender, marketId, outcome, side, price, amount);

        // ====== MATCHING ======
        _tryMatch(orderId);

        // 如果还有剩余未成交，挂入订单簿
        if (orders[orderId].amount > 0 && orders[orderId].isActive) {
            _orderBook[marketId][outcome][side][price].push(orderId);
            _orderBookDepth[marketId][outcome][side][price] += orders[orderId].amount;
        }
    }

    // ============================================================
    //                    取消订单 (Cancel)
    // ============================================================

    /**
     * @notice 取消活跃订单，退还锁定的资金或代币
     * @param orderId 要取消的订单 ID
     */
    function cancelOrder(uint256 orderId) external nonReentrant {
        Order storage order = orders[orderId];

        // Checks
        if (order.id == 0) revert OrderNotFound();
        if (order.owner != msg.sender) revert NotOrderOwner();
        if (!order.isActive) revert OrderNotActive();

        // Effects
        order.isActive = false;
        uint256 remainingAmount = order.amount;
        order.amount = 0;

        // 更新订单簿深度
        _orderBookDepth[order.marketId][order.outcome][order.side][order.price] -= remainingAmount;

        // 退还资金/代币
        if (order.side == SIDE_BUY) {
            uint256 refund = (order.price * remainingAmount) / PRICE_PRECISION;
            lockedBalances[msg.sender] -= refund;
            userBalances[msg.sender] += refund;
        } else {
            // SELL: 退还锁定的代币
            uint256 tokenId = getTokenId(order.marketId, order.outcome);
            _safeTransferFrom(address(this), msg.sender, tokenId, remainingAmount, "");
        }

        emit OrderCancelled(orderId, msg.sender);
    }

    // ============================================================
    //                   市场结算 (Resolution)
    // ============================================================

    /**
     * @notice 结算市场（仅 Oracle/Owner 可调用）
     * @param marketId       市场 ID
     * @param winningOutcome 获胜方: 0=NO, 1=YES
     */
    function resolveMarket(bytes32 marketId, uint8 winningOutcome) external onlyOwner {
        // Checks
        if (markets[marketId].status != MarketStatus.Active) revert MarketAlreadyResolved();
        if (winningOutcome > 1) revert InvalidOutcome();

        // Effects
        markets[marketId].status = MarketStatus.Resolved;
        markets[marketId].winningOutcome = winningOutcome;
        markets[marketId].resolvedAt = block.timestamp;

        emit MarketResolved(marketId, winningOutcome, block.timestamp);
    }

    /**
     * @notice 赎回获胜代币，兑换为 USDC 余额
     * @param marketId 已结算的市场 ID
     */
    function redeem(bytes32 marketId) external nonReentrant {
        // Checks
        if (markets[marketId].status != MarketStatus.Resolved) revert MarketNotResolved();

        uint8 winningOutcome = markets[marketId].winningOutcome;
        uint256 tokenId = getTokenId(marketId, winningOutcome);
        uint256 tokenBalance = balanceOf(msg.sender, tokenId);

        if (tokenBalance == 0) revert NoWinningTokens();

        // Effects: 销毁代币，增加 USDC 余额
        _burn(msg.sender, tokenId, tokenBalance);

        // 1 token = 1 USDC (都是 1e6 精度)
        userBalances[msg.sender] += tokenBalance;

        // 减少市场锁定
        if (marketTotalLocked[marketId] >= tokenBalance) {
            marketTotalLocked[marketId] -= tokenBalance;
        }

        emit Redemption(msg.sender, marketId, tokenBalance, tokenBalance);
    }

    // ============================================================
    //                       视图函数
    // ============================================================

    /**
     * @notice 计算 ERC1155 token ID
     * @param marketId 市场 ID
     * @param outcome  0=NO, 1=YES
     */
    function getTokenId(bytes32 marketId, uint8 outcome) public pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(marketId, outcome)));
    }

    /**
     * @notice 获取用户的订单 ID 列表
     */
    function getUserOrderIds(address user) external view returns (uint256[] memory) {
        return _userOrderIds[user];
    }

    /**
     * @notice 获取用户所有活跃订单
     */
    function getUserActiveOrders(address user) external view returns (Order[] memory) {
        uint256[] memory ids = _userOrderIds[user];

        // 计数
        uint256 count = 0;
        for (uint256 i = 0; i < ids.length; i++) {
            if (orders[ids[i]].isActive) count++;
        }

        // 填充
        Order[] memory activeOrders = new Order[](count);
        uint256 j = 0;
        for (uint256 i = 0; i < ids.length; i++) {
            if (orders[ids[i]].isActive) {
                activeOrders[j++] = orders[ids[i]];
            }
        }
        return activeOrders;
    }

    /**
     * @notice 获取指定价位的订单簿深度
     */
    function getOrderBookDepthAt(
        bytes32 marketId,
        uint8 outcome,
        uint8 side,
        uint256 price
    ) external view returns (uint256) {
        return _orderBookDepth[marketId][outcome][side][price];
    }

    /**
     * @notice 获取市场某 outcome 的完整订单簿快照
     * @return bidPrices  买单价格列表（从高到低）
     * @return bidAmounts 买单数量列表
     * @return askPrices  卖单价格列表（从低到高）
     * @return askAmounts 卖单数量列表
     */
    function getOrderBookSnapshot(
        bytes32 marketId,
        uint8 outcome
    )
        external
        view
        returns (
            uint256[] memory bidPrices,
            uint256[] memory bidAmounts,
            uint256[] memory askPrices,
            uint256[] memory askAmounts
        )
    {
        // 计数非零深度
        uint256 bidCount = 0;
        uint256 askCount = 0;

        for (uint256 p = MIN_PRICE; p <= MAX_PRICE; p++) {
            if (_orderBookDepth[marketId][outcome][SIDE_BUY][p] > 0) bidCount++;
            if (_orderBookDepth[marketId][outcome][SIDE_SELL][p] > 0) askCount++;
        }

        bidPrices = new uint256[](bidCount);
        bidAmounts = new uint256[](bidCount);
        askPrices = new uint256[](askCount);
        askAmounts = new uint256[](askCount);

        // 买单从高到低
        uint256 bi = 0;
        for (uint256 p = MAX_PRICE; p >= MIN_PRICE; p--) {
            uint256 depth = _orderBookDepth[marketId][outcome][SIDE_BUY][p];
            if (depth > 0) {
                bidPrices[bi] = p;
                bidAmounts[bi] = depth;
                bi++;
            }
            if (p == MIN_PRICE) break; // 防止 uint 下溢
        }

        // 卖单从低到高
        uint256 ai = 0;
        for (uint256 p = MIN_PRICE; p <= MAX_PRICE; p++) {
            uint256 depth = _orderBookDepth[marketId][outcome][SIDE_SELL][p];
            if (depth > 0) {
                askPrices[ai] = p;
                askAmounts[ai] = depth;
                ai++;
            }
        }
    }

    /**
     * @notice 获取市场状态
     */
    function getMarketStatus(bytes32 marketId)
        external
        view
        returns (MarketStatus status, uint8 winningOutcome, uint256 resolvedAt)
    {
        Market memory m = markets[marketId];
        return (m.status, m.winningOutcome, m.resolvedAt);
    }

    // ============================================================
    //                    内部撮合引擎
    // ============================================================

    /**
     * @dev 尝试撮合新订单与订单簿中的已有订单
     */
    function _tryMatch(uint256 takerOrderId) internal {
        Order storage taker = orders[takerOrderId];
        uint256 matchCount = 0;

        if (taker.side == SIDE_BUY) {
            // === 策略 1: 与对面 outcome 的 BUY 订单撮合 (Complete Set) ===
            uint8 oppositeOutcome = 1 - taker.outcome;
            // 对手最低价 = 100 - taker.price (刚好互补)
            uint256 minComplementPrice = PRICE_PRECISION - taker.price;

            for (uint256 p = MAX_PRICE; p >= minComplementPrice && taker.amount > 0; p--) {
                if (_orderBookDepth[taker.marketId][oppositeOutcome][SIDE_BUY][p] > 0) {
                    matchCount += _matchBuyVsBuy(takerOrderId, oppositeOutcome, p, matchCount);
                }
                if (matchCount >= MAX_MATCHES_PER_ORDER) break;
                if (p == MIN_PRICE) break; // 防止 uint 下溢
            }

            // === 策略 2: 与同 outcome 的 SELL 订单撮合 (代币转移) ===
            for (uint256 p = MIN_PRICE; p <= taker.price && taker.amount > 0; p++) {
                if (_orderBookDepth[taker.marketId][taker.outcome][SIDE_SELL][p] > 0) {
                    matchCount += _matchBuyVsSell(takerOrderId, p, matchCount);
                }
                if (matchCount >= MAX_MATCHES_PER_ORDER) break;
            }
        } else {
            // SELL taker: 与同 outcome 的 BUY 订单撮合
            for (uint256 p = MAX_PRICE; p >= taker.price && taker.amount > 0; p--) {
                if (_orderBookDepth[taker.marketId][taker.outcome][SIDE_BUY][p] > 0) {
                    matchCount += _matchSellVsBuy(takerOrderId, p, matchCount);
                }
                if (matchCount >= MAX_MATCHES_PER_ORDER) break;
                if (p == MIN_PRICE) break;
            }
        }
    }

    /**
     * @dev BUY vs BUY 撮合 (Complete Set 铸造)
     *      taker 买 outcome A, maker 买 outcome B, A != B
     *      条件: takerPrice + makerPrice >= 100
     */
    function _matchBuyVsBuy(
        uint256 takerOrderId,
        uint8 makerOutcome,
        uint256 makerPrice,
        uint256 currentMatchCount
    ) internal returns (uint256 newMatches) {
        Order storage taker = orders[takerOrderId];
        uint256[] storage makerIds = _orderBook[taker.marketId][makerOutcome][SIDE_BUY][makerPrice];

        for (uint256 i = 0; i < makerIds.length && taker.amount > 0; i++) {
            if (currentMatchCount + newMatches >= MAX_MATCHES_PER_ORDER) break;

            Order storage maker = orders[makerIds[i]];
            if (!maker.isActive || maker.amount == 0) continue;

            uint256 matchAmount = taker.amount < maker.amount ? taker.amount : maker.amount;

            // 铸造 Complete Set（作用域块减少栈深度）
            {
                address yesBuyer = taker.outcome == OUTCOME_YES ? taker.owner : maker.owner;
                address noBuyer = taker.outcome == OUTCOME_YES ? maker.owner : taker.owner;
                uint256 yesTokenId = getTokenId(taker.marketId, OUTCOME_YES);
                uint256 noTokenId = getTokenId(taker.marketId, OUTCOME_NO);
                _mint(yesBuyer, yesTokenId, matchAmount, "");
                _mint(noBuyer, noTokenId, matchAmount, "");
            }

            // 处理锁定资金和价格改善
            {
                uint256 takerCost = (taker.price * matchAmount) / PRICE_PRECISION;
                uint256 makerCost = (makerPrice * matchAmount) / PRICE_PRECISION;

                lockedBalances[taker.owner] -= takerCost;
                lockedBalances[maker.owner] -= makerCost;

                // Complete Set 支撑 = matchAmount (1 token = 1 USDC)
                marketTotalLocked[taker.marketId] += matchAmount;

                // 价格改善：如果 takerPrice + makerPrice > 100, 退还多余给 taker
                uint256 totalPaid = takerCost + makerCost;
                if (totalPaid > matchAmount) {
                    userBalances[taker.owner] += (totalPaid - matchAmount);
                }
            }

            // 更新订单数量
            taker.amount -= matchAmount;
            maker.amount -= matchAmount;

            // 更新订单簿深度
            _orderBookDepth[taker.marketId][makerOutcome][SIDE_BUY][makerPrice] -= matchAmount;

            if (maker.amount == 0) {
                maker.isActive = false;
            }

            // 触发事件
            {
                address buyer = taker.outcome == OUTCOME_YES ? taker.owner : maker.owner;
                address seller = taker.outcome == OUTCOME_YES ? maker.owner : taker.owner;
                emit OrderMatched(
                    taker.marketId,
                    taker.outcome == OUTCOME_YES ? taker.id : maker.id,
                    taker.outcome == OUTCOME_NO ? taker.id : maker.id,
                    taker.price,
                    matchAmount,
                    buyer,
                    seller
                );
            }

            newMatches++;
        }
    }

    /**
     * @dev BUY vs SELL 撮合 (代币转移)
     *      taker 买 outcome, maker 卖 outcome
     *      条件: makerPrice <= takerPrice
     */
    function _matchBuyVsSell(
        uint256 takerOrderId,
        uint256 makerPrice,
        uint256 currentMatchCount
    ) internal returns (uint256 newMatches) {
        Order storage taker = orders[takerOrderId];
        uint256[] storage makerIds = _orderBook[taker.marketId][taker.outcome][SIDE_SELL][makerPrice];

        for (uint256 i = 0; i < makerIds.length && taker.amount > 0; i++) {
            if (currentMatchCount + newMatches >= MAX_MATCHES_PER_ORDER) break;

            Order storage maker = orders[makerIds[i]];
            if (!maker.isActive || maker.amount == 0) continue;

            uint256 matchAmount = taker.amount < maker.amount ? taker.amount : maker.amount;

            // 成交价 = maker 的挂单价（对 taker 有利）
            uint256 tradePrice = makerPrice;
            uint256 payment = (tradePrice * matchAmount) / PRICE_PRECISION;

            // 代币从合约（maker锁定的）转给 taker(buyer)
            uint256 tokenId = getTokenId(taker.marketId, taker.outcome);
            _safeTransferFrom(address(this), taker.owner, tokenId, matchAmount, "");

            // USDC: taker 的锁定资金 → maker 的可用余额
            uint256 takerLocked = (taker.price * matchAmount) / PRICE_PRECISION;
            lockedBalances[taker.owner] -= takerLocked;
            userBalances[maker.owner] += payment;

            // 退还 taker 的价格改善
            if (takerLocked > payment) {
                userBalances[taker.owner] += (takerLocked - payment);
            }

            // 更新订单
            taker.amount -= matchAmount;
            maker.amount -= matchAmount;
            _orderBookDepth[taker.marketId][taker.outcome][SIDE_SELL][makerPrice] -= matchAmount;

            if (maker.amount == 0) {
                maker.isActive = false;
            }

            emit OrderMatched(
                taker.marketId,
                taker.id,
                maker.id,
                tradePrice,
                matchAmount,
                taker.owner,
                maker.owner
            );

            newMatches++;
        }
    }

    /**
     * @dev SELL vs BUY 撮合 (代币转移)
     *      taker 卖 outcome, maker 买 outcome
     *      条件: makerPrice >= takerPrice
     */
    function _matchSellVsBuy(
        uint256 takerOrderId,
        uint256 makerPrice,
        uint256 currentMatchCount
    ) internal returns (uint256 newMatches) {
        Order storage taker = orders[takerOrderId];
        uint256[] storage makerIds = _orderBook[taker.marketId][taker.outcome][SIDE_BUY][makerPrice];

        for (uint256 i = 0; i < makerIds.length && taker.amount > 0; i++) {
            if (currentMatchCount + newMatches >= MAX_MATCHES_PER_ORDER) break;

            Order storage maker = orders[makerIds[i]];
            if (!maker.isActive || maker.amount == 0) continue;

            uint256 matchAmount = taker.amount < maker.amount ? taker.amount : maker.amount;

            // 成交价 = maker 的挂单价（对 taker 有利）
            uint256 tradePrice = makerPrice;
            uint256 payment = (tradePrice * matchAmount) / PRICE_PRECISION;

            // 代币从合约（taker锁定的）转给 maker(buyer)
            uint256 tokenId = getTokenId(taker.marketId, taker.outcome);
            _safeTransferFrom(address(this), maker.owner, tokenId, matchAmount, "");

            // USDC: maker 的锁定资金 → taker(seller) 的可用余额
            uint256 makerLocked = (maker.price * matchAmount) / PRICE_PRECISION;
            lockedBalances[maker.owner] -= makerLocked;
            userBalances[taker.owner] += payment;

            // 退还 maker 的价格改善
            if (makerLocked > payment) {
                userBalances[maker.owner] += (makerLocked - payment);
            }

            // 更新订单
            taker.amount -= matchAmount;
            maker.amount -= matchAmount;
            _orderBookDepth[taker.marketId][taker.outcome][SIDE_BUY][makerPrice] -= matchAmount;

            if (maker.amount == 0) {
                maker.isActive = false;
            }

            emit OrderMatched(
                taker.marketId,
                maker.id,
                taker.id,
                tradePrice,
                matchAmount,
                maker.owner,
                taker.owner
            );

            newMatches++;
        }
    }
}

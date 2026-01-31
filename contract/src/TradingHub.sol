// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title TradingHub
/// @notice 预测市场订单管理合约
/// @dev 仅 Owner 可下单和结算
contract TradingHub is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ 常量 ============
    uint8 public constant OUTCOME_NO = 0;
    uint8 public constant OUTCOME_YES = 1;

    // ============ 状态变量 ============
    IERC20 public immutable usdc;
    uint256 public nextOrderId;

    // ============ 数据结构 ============
    struct Order {
        uint256 orderId;
        address user;
        bytes32 marketId;
        uint8 outcome;
        uint256 amount;
        uint256 timestamp;
        bool settled;
    }

    // ============ 存储 ============
    mapping(uint256 => Order) public orders;
    mapping(address => uint256[]) private userOrders;
    mapping(bytes32 => uint256[]) private marketOrders;

    // ============ 事件 ============
    event OrderPlaced(
        uint256 indexed orderId,
        address indexed user,
        bytes32 indexed marketId,
        uint8 outcome,
        uint256 amount
    );

    event OrderSettled(
        uint256 indexed orderId,
        address indexed user,
        bytes32 indexed marketId,
        bool won,
        uint256 payout
    );

    event MarketSettled(
        bytes32 indexed marketId,
        uint8 winningOutcome,
        uint256 totalOrders
    );

    // ============ 错误 ============
    error InvalidAmount();
    error InvalidOutcome();
    error OrderNotFound();
    error OrderAlreadySettled();
    error InsufficientContractBalance();

    // ============ 构造函数 ============
    constructor(address _usdc) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
        nextOrderId = 1;
    }

    // ============ 下单 (仅Owner) ============

    /// @notice 为用户创建订单
    /// @param user 用户地址
    /// @param marketId 项目/市场ID
    /// @param outcome 选择 (0=NO, 1=YES)
    /// @param amount 购买数量 (USDC, 6位小数)
    /// @return orderId 创建的订单ID
    function placeOrder(
        address user,
        bytes32 marketId,
        uint8 outcome,
        uint256 amount
    ) external onlyOwner nonReentrant returns (uint256 orderId) {
        if (amount == 0) revert InvalidAmount();
        if (outcome > OUTCOME_YES) revert InvalidOutcome();

        // 从用户转入 USDC
        usdc.safeTransferFrom(user, address(this), amount);

        // 创建订单
        orderId = nextOrderId++;
        orders[orderId] = Order({
            orderId: orderId,
            user: user,
            marketId: marketId,
            outcome: outcome,
            amount: amount,
            timestamp: block.timestamp,
            settled: false
        });

        // 记录索引
        userOrders[user].push(orderId);
        marketOrders[marketId].push(orderId);

        emit OrderPlaced(orderId, user, marketId, outcome, amount);
    }

    // ============ 结算 (仅Owner) ============

    /// @notice 结算单个订单
    /// @param orderId 订单ID
    /// @param won 是否获胜
    function settleOrder(uint256 orderId, bool won) external onlyOwner nonReentrant {
        Order storage order = orders[orderId];
        if (order.orderId == 0) revert OrderNotFound();
        if (order.settled) revert OrderAlreadySettled();

        order.settled = true;

        uint256 payout = 0;
        if (won) {
            payout = order.amount * 2;
            if (usdc.balanceOf(address(this)) < payout) {
                revert InsufficientContractBalance();
            }
            usdc.safeTransfer(order.user, payout);
        }

        emit OrderSettled(orderId, order.user, order.marketId, won, payout);
    }

    /// @notice 批量结算市场的所有订单
    /// @param marketId 市场ID
    /// @param winningOutcome 获胜结果 (0=NO, 1=YES)
    function settleMarket(bytes32 marketId, uint8 winningOutcome) external onlyOwner nonReentrant {
        if (winningOutcome > OUTCOME_YES) revert InvalidOutcome();

        uint256[] storage orderIds = marketOrders[marketId];
        uint256 ordersCount = orderIds.length;

        for (uint256 i = 0; i < ordersCount; i++) {
            Order storage order = orders[orderIds[i]];
            if (order.settled) continue;

            order.settled = true;
            bool won = (order.outcome == winningOutcome);

            uint256 payout = 0;
            if (won) {
                payout = order.amount * 2;
                if (usdc.balanceOf(address(this)) < payout) {
                    revert InsufficientContractBalance();
                }
                usdc.safeTransfer(order.user, payout);
            }

            emit OrderSettled(order.orderId, order.user, marketId, won, payout);
        }

        emit MarketSettled(marketId, winningOutcome, ordersCount);
    }

    // ============ 视图函数 ============

    /// @notice 获取订单详情
    function getOrder(uint256 orderId) external view returns (Order memory) {
        return orders[orderId];
    }

    /// @notice 获取用户的所有订单ID列表
    function getUserOrders(address user) external view returns (uint256[] memory) {
        return userOrders[user];
    }

    /// @notice 获取市场的所有订单ID列表
    function getMarketOrders(bytes32 marketId) external view returns (uint256[] memory) {
        return marketOrders[marketId];
    }

    /// @notice 获取用户在指定市场的订单
    function getUserMarketOrders(address user, bytes32 marketId) external view returns (uint256[] memory) {
        uint256[] memory userOrderIds = userOrders[user];
        uint256 count = 0;

        // 计算匹配数量
        for (uint256 i = 0; i < userOrderIds.length; i++) {
            if (orders[userOrderIds[i]].marketId == marketId) {
                count++;
            }
        }

        // 填充结果
        uint256[] memory result = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < userOrderIds.length; i++) {
            if (orders[userOrderIds[i]].marketId == marketId) {
                result[index++] = userOrderIds[i];
            }
        }

        return result;
    }

    /// @notice 获取订单总数
    function totalOrders() external view returns (uint256) {
        return nextOrderId - 1;
    }

    // ============ Owner 功能 ============

    /// @notice 提取合约中的 USDC (仅Owner)
    /// @param to 接收地址
    /// @param amount 提取数量
    function withdrawUSDC(address to, uint256 amount) external onlyOwner {
        usdc.safeTransfer(to, amount);
    }

    /// @notice 存入 USDC 到合约 (用于支付获胜者)
    /// @param user 用户地址 (USDC来源)
    /// @param amount 存入数量
    /// @dev 需要 user 预先 approve 给本合约
    function depositUSDC(address user, uint256 amount) external onlyOwner {
        usdc.safeTransferFrom(user, address(this), amount);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/USDC.sol";
import "../src/TradingHub.sol";

contract TradingHubTest is Test {
    USDC public usdc;
    TradingHub public hub;

    address public owner;
    address public user1;
    address public user2;

    bytes32 public marketId1 = keccak256("market1");
    bytes32 public marketId2 = keccak256("market2");

    uint256 constant AMOUNT = 100 * 1e6; // 100 USDC

    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");

        usdc = new USDC();
        hub = new TradingHub(address(usdc));

        // 给用户铸造 USDC
        usdc.mintUnlimited(user1, 10000 * 1e6);
        usdc.mintUnlimited(user2, 10000 * 1e6);

        // 用户授权给 TradingHub
        vm.prank(user1);
        usdc.approve(address(hub), type(uint256).max);

        vm.prank(user2);
        usdc.approve(address(hub), type(uint256).max);
    }

    // ============ placeOrder 测试 ============

    function test_PlaceOrder() public {
        uint256 orderId = hub.placeOrder(user1, marketId1, hub.OUTCOME_YES(), AMOUNT);

        assertEq(orderId, 1);
        assertEq(hub.totalOrders(), 1);

        TradingHub.Order memory order = hub.getOrder(orderId);
        assertEq(order.orderId, 1);
        assertEq(order.user, user1);
        assertEq(order.marketId, marketId1);
        assertEq(order.outcome, hub.OUTCOME_YES());
        assertEq(order.amount, AMOUNT);
        assertEq(order.settled, false);

        // 检查 USDC 转移
        assertEq(usdc.balanceOf(address(hub)), AMOUNT);
    }

    function test_PlaceOrder_MultipleOrders() public {
        hub.placeOrder(user1, marketId1, hub.OUTCOME_YES(), AMOUNT);
        hub.placeOrder(user1, marketId1, hub.OUTCOME_NO(), AMOUNT);
        hub.placeOrder(user2, marketId1, hub.OUTCOME_YES(), AMOUNT * 2);

        assertEq(hub.totalOrders(), 3);
        assertEq(usdc.balanceOf(address(hub)), AMOUNT * 4);
    }

    function test_RevertWhen_PlaceOrder_InvalidAmount() public {
        uint8 outcome = hub.OUTCOME_YES();
        vm.expectRevert(TradingHub.InvalidAmount.selector);
        hub.placeOrder(user1, marketId1, outcome, 0);
    }

    function test_RevertWhen_PlaceOrder_InvalidOutcome() public {
        vm.expectRevert(TradingHub.InvalidOutcome.selector);
        hub.placeOrder(user1, marketId1, 2, AMOUNT);
    }

    function test_RevertWhen_PlaceOrder_NotOwner() public {
        uint8 outcome = hub.OUTCOME_YES();
        vm.prank(user1);
        vm.expectRevert();
        hub.placeOrder(user1, marketId1, outcome, AMOUNT);
    }

    // ============ settleOrder 测试 ============

    function test_SettleOrder_Won() public {
        uint256 orderId = hub.placeOrder(user1, marketId1, hub.OUTCOME_YES(), AMOUNT);

        // 存入额外资金用于支付奖金
        usdc.mintUnlimited(address(hub), AMOUNT);

        uint256 balanceBefore = usdc.balanceOf(user1);
        hub.settleOrder(orderId, true);
        uint256 balanceAfter = usdc.balanceOf(user1);

        // 获胜应该得到 2 倍
        assertEq(balanceAfter - balanceBefore, AMOUNT * 2);

        TradingHub.Order memory order = hub.getOrder(orderId);
        assertEq(order.settled, true);
    }

    function test_SettleOrder_Lost() public {
        uint256 orderId = hub.placeOrder(user1, marketId1, hub.OUTCOME_YES(), AMOUNT);

        uint256 balanceBefore = usdc.balanceOf(user1);
        hub.settleOrder(orderId, false);
        uint256 balanceAfter = usdc.balanceOf(user1);

        // 失败不应该得到任何返还
        assertEq(balanceAfter, balanceBefore);

        TradingHub.Order memory order = hub.getOrder(orderId);
        assertEq(order.settled, true);
    }

    function test_RevertWhen_SettleOrder_NotFound() public {
        vm.expectRevert(TradingHub.OrderNotFound.selector);
        hub.settleOrder(999, true);
    }

    function test_RevertWhen_SettleOrder_AlreadySettled() public {
        uint256 orderId = hub.placeOrder(user1, marketId1, hub.OUTCOME_YES(), AMOUNT);
        hub.settleOrder(orderId, false);

        vm.expectRevert(TradingHub.OrderAlreadySettled.selector);
        hub.settleOrder(orderId, true);
    }

    function test_RevertWhen_SettleOrder_InsufficientBalance() public {
        uint256 orderId = hub.placeOrder(user1, marketId1, hub.OUTCOME_YES(), AMOUNT);

        // 不存入额外资金，余额不足以支付 2 倍
        vm.expectRevert(TradingHub.InsufficientContractBalance.selector);
        hub.settleOrder(orderId, true);
    }

    // ============ settleMarket 测试 ============

    function test_SettleMarket() public {
        // 创建多个订单
        hub.placeOrder(user1, marketId1, hub.OUTCOME_YES(), AMOUNT);
        hub.placeOrder(user2, marketId1, hub.OUTCOME_NO(), AMOUNT);
        hub.placeOrder(user1, marketId1, hub.OUTCOME_YES(), AMOUNT);

        // 存入额外资金
        usdc.mintUnlimited(address(hub), AMOUNT * 4);

        uint256 user1BalanceBefore = usdc.balanceOf(user1);
        uint256 user2BalanceBefore = usdc.balanceOf(user2);

        // YES 获胜
        hub.settleMarket(marketId1, hub.OUTCOME_YES());

        uint256 user1BalanceAfter = usdc.balanceOf(user1);
        uint256 user2BalanceAfter = usdc.balanceOf(user2);

        // user1 有 2 个 YES 订单，应该得到 4 倍 AMOUNT
        assertEq(user1BalanceAfter - user1BalanceBefore, AMOUNT * 4);
        // user2 有 1 个 NO 订单，不应该得到任何返还
        assertEq(user2BalanceAfter, user2BalanceBefore);
    }

    function test_SettleMarket_SkipsAlreadySettled() public {
        uint256 orderId1 = hub.placeOrder(user1, marketId1, hub.OUTCOME_YES(), AMOUNT);
        hub.placeOrder(user1, marketId1, hub.OUTCOME_YES(), AMOUNT);

        // 存入额外资金
        usdc.mintUnlimited(address(hub), AMOUNT * 4);

        // 先结算第一个订单
        hub.settleOrder(orderId1, true);

        // 再批量结算市场
        hub.settleMarket(marketId1, hub.OUTCOME_YES());

        // 两个订单都应该已结算
        assertEq(hub.getOrder(1).settled, true);
        assertEq(hub.getOrder(2).settled, true);
    }

    function test_RevertWhen_SettleMarket_InsufficientBalance() public {
        uint8 outcome = hub.OUTCOME_YES();
        hub.placeOrder(user1, marketId1, outcome, AMOUNT);

        // 不存入额外资金，余额只有 AMOUNT，但需要支付 2*AMOUNT
        vm.expectRevert(TradingHub.InsufficientContractBalance.selector);
        hub.settleMarket(marketId1, outcome);
    }

    // ============ 视图函数测试 ============

    function test_GetUserOrders() public {
        hub.placeOrder(user1, marketId1, hub.OUTCOME_YES(), AMOUNT);
        hub.placeOrder(user1, marketId2, hub.OUTCOME_NO(), AMOUNT);
        hub.placeOrder(user2, marketId1, hub.OUTCOME_YES(), AMOUNT);

        uint256[] memory user1Orders = hub.getUserOrders(user1);
        assertEq(user1Orders.length, 2);
        assertEq(user1Orders[0], 1);
        assertEq(user1Orders[1], 2);

        uint256[] memory user2Orders = hub.getUserOrders(user2);
        assertEq(user2Orders.length, 1);
        assertEq(user2Orders[0], 3);
    }

    function test_GetMarketOrders() public {
        hub.placeOrder(user1, marketId1, hub.OUTCOME_YES(), AMOUNT);
        hub.placeOrder(user1, marketId2, hub.OUTCOME_NO(), AMOUNT);
        hub.placeOrder(user2, marketId1, hub.OUTCOME_YES(), AMOUNT);

        uint256[] memory market1Orders = hub.getMarketOrders(marketId1);
        assertEq(market1Orders.length, 2);

        uint256[] memory market2Orders = hub.getMarketOrders(marketId2);
        assertEq(market2Orders.length, 1);
    }

    function test_GetUserMarketOrders() public {
        hub.placeOrder(user1, marketId1, hub.OUTCOME_YES(), AMOUNT);
        hub.placeOrder(user1, marketId2, hub.OUTCOME_NO(), AMOUNT);
        hub.placeOrder(user1, marketId1, hub.OUTCOME_NO(), AMOUNT);

        uint256[] memory orders = hub.getUserMarketOrders(user1, marketId1);
        assertEq(orders.length, 2);
        assertEq(orders[0], 1);
        assertEq(orders[1], 3);
    }

    // ============ depositUSDC / withdrawUSDC 测试 ============

    function test_DepositUSDC() public {
        uint256 amount = 1000 * 1e6;

        hub.depositUSDC(user1, amount);

        assertEq(usdc.balanceOf(address(hub)), amount);
    }

    function test_WithdrawUSDC() public {
        uint256 amount = 1000 * 1e6;
        usdc.mintUnlimited(address(hub), amount);

        hub.withdrawUSDC(owner, amount);

        assertEq(usdc.balanceOf(owner), amount);
    }

    function test_RevertWhen_DepositUSDC_NotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        hub.depositUSDC(user1, AMOUNT);
    }

    function test_RevertWhen_WithdrawUSDC_NotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        hub.withdrawUSDC(user1, AMOUNT);
    }
}

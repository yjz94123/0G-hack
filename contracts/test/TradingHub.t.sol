// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/DemoUSDC.sol";
import "../src/TradingHub.sol";

/**
 * @title TradingHubTest
 * @notice TradingHub 核心功能单元测试 (deposit/withdraw/placeOrder/cancelOrder/resolve/redeem)
 */
contract TradingHubTest is Test {
    DemoUSDC public usdc;
    TradingHub public hub;

    address public oracle = makeAddr("oracle");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    bytes32 public marketId = keccak256("test-market-condition-id");

    uint256 constant USDC_UNIT = 1e6;
    uint8 constant YES = 1;
    uint8 constant NO = 0;
    uint8 constant BUY = 0;
    uint8 constant SELL = 1;

    function setUp() public {
        usdc = new DemoUSDC();
        hub = new TradingHub(address(usdc), oracle);

        // 给 alice 和 bob 各铸造 10,000 dUSDC
        usdc.mint(alice, 10_000 * USDC_UNIT);
        vm.warp(block.timestamp + 2 hours);
        usdc.mint(bob, 10_000 * USDC_UNIT);

        // alice 和 bob approve TradingHub
        vm.prank(alice);
        usdc.approve(address(hub), type(uint256).max);
        vm.prank(bob);
        usdc.approve(address(hub), type(uint256).max);
    }

    // ============================================================
    //                        Deposit
    // ============================================================

    function test_Deposit() public {
        uint256 amount = 1000 * USDC_UNIT;

        vm.prank(alice);
        hub.deposit(amount);

        assertEq(hub.userBalances(alice), amount);
        assertEq(usdc.balanceOf(address(hub)), amount);
        assertEq(usdc.balanceOf(alice), 10_000 * USDC_UNIT - amount);
    }

    function test_Deposit_EmitsEvent() public {
        uint256 amount = 500 * USDC_UNIT;

        vm.expectEmit(true, false, false, true);
        emit TradingHub.Deposit(alice, amount);

        vm.prank(alice);
        hub.deposit(amount);
    }

    function test_RevertWhen_DepositZero() public {
        vm.prank(alice);
        vm.expectRevert(TradingHub.InvalidAmount.selector);
        hub.deposit(0);
    }

    // ============================================================
    //                        Withdraw
    // ============================================================

    function test_Withdraw() public {
        uint256 depositAmt = 1000 * USDC_UNIT;
        uint256 withdrawAmt = 400 * USDC_UNIT;

        vm.startPrank(alice);
        hub.deposit(depositAmt);
        hub.withdraw(withdrawAmt);
        vm.stopPrank();

        assertEq(hub.userBalances(alice), depositAmt - withdrawAmt);
        assertEq(usdc.balanceOf(alice), 10_000 * USDC_UNIT - depositAmt + withdrawAmt);
    }

    function test_RevertWhen_WithdrawZero() public {
        vm.prank(alice);
        vm.expectRevert(TradingHub.InvalidAmount.selector);
        hub.withdraw(0);
    }

    function test_RevertWhen_WithdrawInsufficientBalance() public {
        vm.startPrank(alice);
        hub.deposit(100 * USDC_UNIT);

        vm.expectRevert(TradingHub.InsufficientBalance.selector);
        hub.withdraw(200 * USDC_UNIT);
        vm.stopPrank();
    }

    // ============================================================
    //                     PlaceOrder 基础
    // ============================================================

    function test_PlaceOrder_BuyYes() public {
        vm.startPrank(alice);
        hub.deposit(1000 * USDC_UNIT);

        uint256 orderId = hub.placeOrder(marketId, YES, BUY, 65, 100 * USDC_UNIT);
        vm.stopPrank();

        assertEq(orderId, 1);

        // 锁定 = 65 * 100e6 / 100 = 65e6
        uint256 expectedLocked = 65 * USDC_UNIT;
        assertEq(hub.lockedBalances(alice), expectedLocked);
        assertEq(hub.userBalances(alice), 1000 * USDC_UNIT - expectedLocked);
    }

    function test_PlaceOrder_EmitsEvent() public {
        vm.startPrank(alice);
        hub.deposit(1000 * USDC_UNIT);

        vm.expectEmit(true, true, true, true);
        emit TradingHub.OrderPlaced(1, alice, marketId, YES, BUY, 65, 100 * USDC_UNIT);

        hub.placeOrder(marketId, YES, BUY, 65, 100 * USDC_UNIT);
        vm.stopPrank();
    }

    function test_RevertWhen_PlaceOrder_InvalidPrice_Zero() public {
        vm.startPrank(alice);
        hub.deposit(1000 * USDC_UNIT);

        vm.expectRevert(TradingHub.InvalidPrice.selector);
        hub.placeOrder(marketId, YES, BUY, 0, 100 * USDC_UNIT);
        vm.stopPrank();
    }

    function test_RevertWhen_PlaceOrder_InvalidPrice_100() public {
        vm.startPrank(alice);
        hub.deposit(1000 * USDC_UNIT);

        vm.expectRevert(TradingHub.InvalidPrice.selector);
        hub.placeOrder(marketId, YES, BUY, 100, 100 * USDC_UNIT);
        vm.stopPrank();
    }

    function test_RevertWhen_PlaceOrder_ZeroAmount() public {
        vm.startPrank(alice);
        hub.deposit(1000 * USDC_UNIT);

        vm.expectRevert(TradingHub.InvalidAmount.selector);
        hub.placeOrder(marketId, YES, BUY, 50, 0);
        vm.stopPrank();
    }

    function test_RevertWhen_PlaceOrder_InvalidOutcome() public {
        vm.startPrank(alice);
        hub.deposit(1000 * USDC_UNIT);

        vm.expectRevert(TradingHub.InvalidOutcome.selector);
        hub.placeOrder(marketId, 2, BUY, 50, 100 * USDC_UNIT);
        vm.stopPrank();
    }

    function test_RevertWhen_PlaceOrder_InsufficientBalance() public {
        vm.startPrank(alice);
        hub.deposit(10 * USDC_UNIT);

        // 买 100 USDC 的代币 @ 50%，需要 50 USDC，余额只有 10
        vm.expectRevert(TradingHub.InsufficientBalance.selector);
        hub.placeOrder(marketId, YES, BUY, 50, 100 * USDC_UNIT);
        vm.stopPrank();
    }

    function test_RevertWhen_PlaceOrder_MarketResolved() public {
        // 先结算市场
        vm.prank(oracle);
        hub.resolveMarket(marketId, YES);

        // 尝试下单
        vm.startPrank(alice);
        hub.deposit(1000 * USDC_UNIT);

        vm.expectRevert(TradingHub.MarketNotActive.selector);
        hub.placeOrder(marketId, YES, BUY, 50, 100 * USDC_UNIT);
        vm.stopPrank();
    }

    // ============================================================
    //                      CancelOrder
    // ============================================================

    function test_CancelOrder_BuyOrder() public {
        vm.startPrank(alice);
        hub.deposit(1000 * USDC_UNIT);
        uint256 orderId = hub.placeOrder(marketId, YES, BUY, 65, 100 * USDC_UNIT);

        uint256 balanceBefore = hub.userBalances(alice);
        hub.cancelOrder(orderId);
        uint256 balanceAfter = hub.userBalances(alice);
        vm.stopPrank();

        // 退还 65 USDC
        assertEq(balanceAfter - balanceBefore, 65 * USDC_UNIT);
        assertEq(hub.lockedBalances(alice), 0);

        // 订单不再活跃
        (,,,,,,, , bool isActive) = hub.orders(orderId);
        assertFalse(isActive);
    }

    function test_RevertWhen_CancelOrder_NotOwner() public {
        vm.startPrank(alice);
        hub.deposit(1000 * USDC_UNIT);
        uint256 orderId = hub.placeOrder(marketId, YES, BUY, 50, 100 * USDC_UNIT);
        vm.stopPrank();

        vm.prank(bob);
        vm.expectRevert(TradingHub.NotOrderOwner.selector);
        hub.cancelOrder(orderId);
    }

    function test_RevertWhen_CancelOrder_AlreadyCancelled() public {
        vm.startPrank(alice);
        hub.deposit(1000 * USDC_UNIT);
        uint256 orderId = hub.placeOrder(marketId, YES, BUY, 50, 100 * USDC_UNIT);
        hub.cancelOrder(orderId);

        vm.expectRevert(TradingHub.OrderNotActive.selector);
        hub.cancelOrder(orderId);
        vm.stopPrank();
    }

    function test_RevertWhen_CancelOrder_NotFound() public {
        vm.prank(alice);
        vm.expectRevert(TradingHub.OrderNotFound.selector);
        hub.cancelOrder(999);
    }

    // ============================================================
    //                    ResolveMarket
    // ============================================================

    function test_ResolveMarket() public {
        vm.prank(oracle);
        hub.resolveMarket(marketId, YES);

        (TradingHub.MarketStatus status, uint8 winner, uint256 resolvedAt) =
            hub.getMarketStatus(marketId);

        assertEq(uint8(status), uint8(TradingHub.MarketStatus.Resolved));
        assertEq(winner, YES);
        assertGt(resolvedAt, 0);
    }

    function test_ResolveMarket_EmitsEvent() public {
        vm.expectEmit(true, false, false, true);
        emit TradingHub.MarketResolved(marketId, YES, block.timestamp);

        vm.prank(oracle);
        hub.resolveMarket(marketId, YES);
    }

    function test_RevertWhen_ResolveMarket_NotOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        hub.resolveMarket(marketId, YES);
    }

    function test_RevertWhen_ResolveMarket_AlreadyResolved() public {
        vm.startPrank(oracle);
        hub.resolveMarket(marketId, YES);

        vm.expectRevert(TradingHub.MarketAlreadyResolved.selector);
        hub.resolveMarket(marketId, NO);
        vm.stopPrank();
    }

    function test_RevertWhen_ResolveMarket_InvalidOutcome() public {
        vm.prank(oracle);
        vm.expectRevert(TradingHub.InvalidOutcome.selector);
        hub.resolveMarket(marketId, 2);
    }

    // ============================================================
    //                        Redeem
    // ============================================================

    function test_RevertWhen_Redeem_MarketNotResolved() public {
        vm.prank(alice);
        vm.expectRevert(TradingHub.MarketNotResolved.selector);
        hub.redeem(marketId);
    }

    function test_RevertWhen_Redeem_NoWinningTokens() public {
        vm.prank(oracle);
        hub.resolveMarket(marketId, YES);

        vm.prank(alice);
        vm.expectRevert(TradingHub.NoWinningTokens.selector);
        hub.redeem(marketId);
    }

    // ============================================================
    //                      视图函数
    // ============================================================

    function test_GetTokenId_Deterministic() public view {
        uint256 yesId = hub.getTokenId(marketId, YES);
        uint256 noId = hub.getTokenId(marketId, NO);

        // 同市场 YES 和 NO 的 tokenId 不同
        assertTrue(yesId != noId);

        // 同样的输入产生同样的输出
        assertEq(yesId, hub.getTokenId(marketId, YES));
    }

    function test_GetUserOrderIds() public {
        vm.startPrank(alice);
        hub.deposit(1000 * USDC_UNIT);
        hub.placeOrder(marketId, YES, BUY, 50, 10 * USDC_UNIT);
        hub.placeOrder(marketId, NO, BUY, 30, 10 * USDC_UNIT);
        vm.stopPrank();

        uint256[] memory ids = hub.getUserOrderIds(alice);
        assertEq(ids.length, 2);
        assertEq(ids[0], 1);
        assertEq(ids[1], 2);
    }

    function test_GetUserActiveOrders() public {
        vm.startPrank(alice);
        hub.deposit(1000 * USDC_UNIT);
        hub.placeOrder(marketId, YES, BUY, 50, 10 * USDC_UNIT);
        uint256 order2 = hub.placeOrder(marketId, NO, BUY, 30, 10 * USDC_UNIT);
        hub.cancelOrder(order2);
        vm.stopPrank();

        TradingHub.Order[] memory active = hub.getUserActiveOrders(alice);
        assertEq(active.length, 1);
        assertEq(active[0].id, 1);
    }

    // ============================================================
    //                  资金不变量检查
    // ============================================================

    function test_Invariant_ContractBalanceCoversObligations() public {
        // 多用户多操作后，合约 USDC 余额 >= 所有用户余额 + 锁定余额
        vm.startPrank(alice);
        hub.deposit(500 * USDC_UNIT);
        hub.placeOrder(marketId, YES, BUY, 60, 100 * USDC_UNIT);
        vm.stopPrank();

        vm.startPrank(bob);
        hub.deposit(500 * USDC_UNIT);
        hub.placeOrder(marketId, NO, BUY, 30, 50 * USDC_UNIT);
        vm.stopPrank();

        uint256 contractBalance = usdc.balanceOf(address(hub));
        uint256 obligations = hub.userBalances(alice) + hub.userBalances(bob)
            + hub.lockedBalances(alice) + hub.lockedBalances(bob);

        assertGe(contractBalance, obligations);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/DemoUSDC.sol";
import "../src/TradingHub.sol";

/**
 * @title TradingHubMatchingTest
 * @notice 订单撮合逻辑专项测试
 */
contract TradingHubMatchingTest is Test {
    DemoUSDC public usdc;
    TradingHub public hub;

    address public oracle = makeAddr("oracle");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public charlie = makeAddr("charlie");

    bytes32 public marketId = keccak256("btc-100k-market");

    uint256 constant USDC_UNIT = 1e6;
    uint8 constant YES = 1;
    uint8 constant NO = 0;
    uint8 constant BUY = 0;
    uint8 constant SELL = 1;

    function setUp() public {
        usdc = new DemoUSDC();
        hub = new TradingHub(address(usdc), oracle);

        // 给用户铸造并 approve
        _fundAndApprove(alice, 10_000 * USDC_UNIT);
        _fundAndApprove(bob, 10_000 * USDC_UNIT);
        _fundAndApprove(charlie, 10_000 * USDC_UNIT);

        // 所有人 deposit
        vm.prank(alice);
        hub.deposit(5_000 * USDC_UNIT);
        vm.prank(bob);
        hub.deposit(5_000 * USDC_UNIT);
        vm.prank(charlie);
        hub.deposit(5_000 * USDC_UNIT);
    }

    function _fundAndApprove(address user, uint256 amount) internal {
        usdc.mint(user, amount);
        vm.warp(block.timestamp + 2 hours); // 跳过冷却
        vm.prank(user);
        usdc.approve(address(hub), type(uint256).max);
    }

    // ============================================================
    //          BUY YES + BUY NO 撮合 (Complete Set)
    // ============================================================

    // 核心场景: Alice 买 YES 65, Bob 买 NO 35
    //         65 + 35 = 100, 精确撮合
    function test_Match_BuyYes_BuyNo_ExactComplement() public {
        // Alice 挂单: BUY YES @ 65, 100 tokens
        vm.prank(alice);
        hub.placeOrder(marketId, YES, BUY, 65, 100 * USDC_UNIT);

        // Bob 下单: BUY NO @ 35, 100 tokens → 应立即撮合
        vm.prank(bob);
        hub.placeOrder(marketId, NO, BUY, 35, 100 * USDC_UNIT);

        // 检查 ERC1155 代币
        uint256 yesTokenId = hub.getTokenId(marketId, YES);
        uint256 noTokenId = hub.getTokenId(marketId, NO);

        assertEq(hub.balanceOf(alice, yesTokenId), 100 * USDC_UNIT, "Alice should have 100 YES tokens");
        assertEq(hub.balanceOf(bob, noTokenId), 100 * USDC_UNIT, "Bob should have 100 NO tokens");

        // 两人锁定余额应为 0（全部成交）
        assertEq(hub.lockedBalances(alice), 0, "Alice locked should be 0");
        assertEq(hub.lockedBalances(bob), 0, "Bob locked should be 0");

        // 合约持有的 USDC = Alice 的 65 + Bob 的 35 = 100 (支撑 Complete Set)
        assertEq(hub.marketTotalLocked(marketId), 100 * USDC_UNIT, "Market total locked should be 100");
    }

    // Alice 买 YES 70, Bob 买 NO 40
    //         70 + 40 = 110 > 100, 多余的 10 应退还给 taker(Bob)
    function test_Match_BuyYes_BuyNo_PriceImprovement() public {
        // Alice 先挂单: BUY YES @ 70, 100 tokens
        vm.prank(alice);
        hub.placeOrder(marketId, YES, BUY, 70, 100 * USDC_UNIT);

        // Bob 后下单: BUY NO @ 40, 100 tokens
        vm.prank(bob);
        hub.placeOrder(marketId, NO, BUY, 40, 100 * USDC_UNIT);

        // 价格改善: 70 + 40 = 110 > 100, 多余的 10 USDC 退还给 taker(Bob)
        // Bob deposited 5000, locked 40*100/100 = 40, got back excess 10
        // 所以 userBalances(bob) = 5000 - 40 + 10 = 4970
        assertEq(hub.userBalances(bob), (5_000 - 40 + 10) * USDC_UNIT, "Bob balance with price improvement");
    }

    // 部分成交: Alice 买 YES 60 100个, Bob 买 NO 40 只有 50个
    //         只能撮合 50 个, Alice 剩余 50 个挂在订单簿
    function test_Match_PartialFill() public {
        // Alice 挂单: BUY YES @ 60, 100 tokens
        vm.prank(alice);
        uint256 aliceOrderId = hub.placeOrder(marketId, YES, BUY, 60, 100 * USDC_UNIT);

        // Bob 下单: BUY NO @ 40, 50 tokens
        vm.prank(bob);
        hub.placeOrder(marketId, NO, BUY, 40, 50 * USDC_UNIT);

        // Alice 部分成交: 获得 50 YES tokens, 剩余 50 挂单
        uint256 yesTokenId = hub.getTokenId(marketId, YES);
        assertEq(hub.balanceOf(alice, yesTokenId), 50 * USDC_UNIT, "Alice should have 50 YES tokens");

        // 检查 Alice 的订单剩余
        (,,,,, , uint256 remaining,,) = hub.orders(aliceOrderId);
        assertEq(remaining, 50 * USDC_UNIT, "Alice order should have 50 remaining");

        // Bob 完全成交
        uint256 noTokenId = hub.getTokenId(marketId, NO);
        assertEq(hub.balanceOf(bob, noTokenId), 50 * USDC_UNIT, "Bob should have 50 NO tokens");
    }

    // 价格不匹配: Alice 买 YES 60, Bob 买 NO 30
    //         60 + 30 = 90 < 100, 不撮合
    function test_NoMatch_PriceTooLow() public {
        vm.prank(alice);
        hub.placeOrder(marketId, YES, BUY, 60, 100 * USDC_UNIT);

        vm.prank(bob);
        hub.placeOrder(marketId, NO, BUY, 30, 100 * USDC_UNIT);

        // 无人获得代币
        uint256 yesTokenId = hub.getTokenId(marketId, YES);
        uint256 noTokenId = hub.getTokenId(marketId, NO);
        assertEq(hub.balanceOf(alice, yesTokenId), 0);
        assertEq(hub.balanceOf(bob, noTokenId), 0);

        // 两人都有锁定余额（挂单中）
        assertGt(hub.lockedBalances(alice), 0);
        assertGt(hub.lockedBalances(bob), 0);
    }

    // ============================================================
    //            BUY vs SELL 撮合 (代币转移)
    // ============================================================

    /**
     * @notice 先通过 Complete Set 铸造给 Alice YES tokens
     *         然后 Alice SELL YES, Charlie BUY YES → 代币转移
     */
    function test_Match_BuyVsSell() public {
        // Step 1: 先制造一些 YES tokens 给 Alice
        // Alice BUY YES@60, Bob BUY NO@40 → 撮合
        vm.prank(alice);
        hub.placeOrder(marketId, YES, BUY, 60, 100 * USDC_UNIT);
        vm.prank(bob);
        hub.placeOrder(marketId, NO, BUY, 40, 100 * USDC_UNIT);

        // Alice 现在持有 100 YES tokens
        uint256 yesTokenId = hub.getTokenId(marketId, YES);
        assertEq(hub.balanceOf(alice, yesTokenId), 100 * USDC_UNIT);

        // Step 2: Alice approve hub 转移 ERC1155
        vm.prank(alice);
        hub.setApprovalForAll(address(hub), true);

        // Step 3: Alice SELL YES @ 70, 50 tokens
        vm.prank(alice);
        hub.placeOrder(marketId, YES, SELL, 70, 50 * USDC_UNIT);

        // Step 4: Charlie BUY YES @ 75, 50 tokens → 应撮合
        vm.prank(charlie);
        hub.placeOrder(marketId, YES, BUY, 75, 50 * USDC_UNIT);

        // Charlie 获得 50 YES tokens
        assertEq(hub.balanceOf(charlie, yesTokenId), 50 * USDC_UNIT, "Charlie should have 50 YES");

        // Alice 还剩 50 YES tokens (卖了 50)
        assertEq(hub.balanceOf(alice, yesTokenId), 50 * USDC_UNIT, "Alice should have 50 YES left");

        // Alice 获得卖出收入: 70 * 50 / 100 = 35 USDC
        // (成交价 = maker 价 = 70)
    }

    // ============================================================
    //          完整生命周期: 下单 → 撮合 → 结算 → 赎回
    // ============================================================

    // 端到端测试:
    //   1. Alice 买 YES 65, Bob 买 NO 35 → 撮合
    //   2. Oracle 结算市场 YES 获胜
    //   3. Alice redeem YES tokens → 获得 USDC
    //   4. Alice withdraw USDC
    function test_FullLifecycle_YesWins() public {
        uint256 amount = 100 * USDC_UNIT;

        // 1. 下单撮合
        vm.prank(alice);
        hub.placeOrder(marketId, YES, BUY, 65, amount);
        vm.prank(bob);
        hub.placeOrder(marketId, NO, BUY, 35, amount);

        // 验证代币铸造
        uint256 yesTokenId = hub.getTokenId(marketId, YES);
        assertEq(hub.balanceOf(alice, yesTokenId), amount);

        // 2. Oracle 结算
        vm.prank(oracle);
        hub.resolveMarket(marketId, YES);

        // 3. Alice 赎回
        uint256 aliceBalanceBefore = hub.userBalances(alice);
        vm.prank(alice);
        hub.redeem(marketId);

        // Alice 获得 100 USDC (1 token = 1 USDC)
        assertEq(hub.userBalances(alice) - aliceBalanceBefore, amount, "Alice should receive 100 USDC");
        assertEq(hub.balanceOf(alice, yesTokenId), 0, "Alice YES tokens should be burned");

        // 4. Alice 提现
        uint256 withdrawable = hub.userBalances(alice);
        vm.prank(alice);
        hub.withdraw(withdrawable);

        assertEq(usdc.balanceOf(alice), 10_000 * USDC_UNIT - 5_000 * USDC_UNIT + withdrawable,
            "Alice USDC balance after full cycle");
    }

    /**
     * @notice NO 获胜场景
     */
    function test_FullLifecycle_NoWins() public {
        uint256 amount = 100 * USDC_UNIT;

        // 下单撮合
        vm.prank(alice);
        hub.placeOrder(marketId, YES, BUY, 65, amount);
        vm.prank(bob);
        hub.placeOrder(marketId, NO, BUY, 35, amount);

        // Oracle 结算 NO 获胜
        vm.prank(oracle);
        hub.resolveMarket(marketId, NO);

        // Bob 赎回 NO tokens
        uint256 noTokenId = hub.getTokenId(marketId, NO);
        assertEq(hub.balanceOf(bob, noTokenId), amount);

        uint256 bobBalanceBefore = hub.userBalances(bob);
        vm.prank(bob);
        hub.redeem(marketId);

        assertEq(hub.userBalances(bob) - bobBalanceBefore, amount, "Bob should receive 100 USDC");

        // Alice 的 YES tokens 没有价值, 无法赎回
        vm.prank(alice);
        vm.expectRevert(TradingHub.NoWinningTokens.selector);
        hub.redeem(marketId);
    }

    // ============================================================
    //                  订单簿快照测试
    // ============================================================

    function test_OrderBookSnapshot() public {
        // 挂多个不同价位的订单
        vm.startPrank(alice);
        hub.placeOrder(marketId, YES, BUY, 60, 100 * USDC_UNIT);
        hub.placeOrder(marketId, YES, BUY, 55, 200 * USDC_UNIT);
        hub.placeOrder(marketId, YES, BUY, 50, 150 * USDC_UNIT);
        vm.stopPrank();

        (
            uint256[] memory bidPrices,
            uint256[] memory bidAmounts,
            uint256[] memory askPrices,
            uint256[] memory askAmounts
        ) = hub.getOrderBookSnapshot(marketId, YES);

        // 应有 3 个买单档位，从高到低
        assertEq(bidPrices.length, 3);
        assertEq(bidPrices[0], 60);
        assertEq(bidPrices[1], 55);
        assertEq(bidPrices[2], 50);

        assertEq(bidAmounts[0], 100 * USDC_UNIT);
        assertEq(bidAmounts[1], 200 * USDC_UNIT);
        assertEq(bidAmounts[2], 150 * USDC_UNIT);

        // 无卖单
        assertEq(askPrices.length, 0);
        assertEq(askAmounts.length, 0);
    }

    // ============================================================
    //                  资金安全不变量
    // ============================================================

    /**
     * @notice 经过多笔操作后，合约 USDC 余额始终 >= 所有义务
     */
    function test_Invariant_Solvency_AfterMultipleOps() public {
        // 各种操作
        vm.prank(alice);
        hub.placeOrder(marketId, YES, BUY, 65, 100 * USDC_UNIT);

        vm.prank(bob);
        hub.placeOrder(marketId, NO, BUY, 35, 100 * USDC_UNIT);

        vm.prank(charlie);
        hub.placeOrder(marketId, YES, BUY, 50, 200 * USDC_UNIT);

        // 结算
        vm.prank(oracle);
        hub.resolveMarket(marketId, YES);

        // Alice 赎回
        vm.prank(alice);
        hub.redeem(marketId);

        // 检查偿付能力
        uint256 contractBalance = usdc.balanceOf(address(hub));
        uint256 totalUserBalances = hub.userBalances(alice) + hub.userBalances(bob) + hub.userBalances(charlie);
        uint256 totalLocked = hub.lockedBalances(alice) + hub.lockedBalances(bob) + hub.lockedBalances(charlie);

        assertGe(contractBalance, totalUserBalances + totalLocked,
            "Contract must always be solvent");
    }
}

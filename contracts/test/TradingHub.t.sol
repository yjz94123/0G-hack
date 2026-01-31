// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/DemoUSDC.sol";
import "../src/TradingHub.sol";

/**
 * @title TradingHubTest
 * @notice TradingHub 镜像交易模式单元测试
 *         (deposit/withdraw/openPosition/closePosition/resolve/redeem/fundReserve)
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

        // alice 和 bob 对 hub 授权 ERC1155（closePosition 需要 burn）
        vm.prank(alice);
        hub.setApprovalForAll(address(hub), true);
        vm.prank(bob);
        hub.setApprovalForAll(address(hub), true);
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
    //                      OpenPosition
    // ============================================================

    function test_OpenPosition_BuyYes() public {
        // alice deposit
        vm.prank(alice);
        hub.deposit(1000 * USDC_UNIT);

        // oracle 为 alice 开仓: 65 USDC @ 65% → 100 tokens
        uint256 usdcAmount = 65 * USDC_UNIT;
        uint256 tokenAmount = 100 * USDC_UNIT;
        uint256 price = 6500; // 65% in basis points

        vm.prank(oracle);
        uint256 posId = hub.openPosition(alice, marketId, YES, usdcAmount, tokenAmount, price);

        assertEq(posId, 1);
        assertEq(hub.userBalances(alice), 1000 * USDC_UNIT - usdcAmount);
        assertEq(hub.marketTotalLocked(marketId), tokenAmount);

        // 检查 ERC1155 余额
        uint256 tokenId = hub.getTokenId(marketId, YES);
        assertEq(hub.balanceOf(alice, tokenId), tokenAmount);
    }

    function test_OpenPosition_EmitsEvent() public {
        vm.prank(alice);
        hub.deposit(1000 * USDC_UNIT);

        uint256 usdcAmount = 65 * USDC_UNIT;
        uint256 tokenAmount = 100 * USDC_UNIT;
        uint256 price = 6500;

        vm.expectEmit(true, true, true, true);
        emit TradingHub.PositionOpened(1, alice, marketId, YES, tokenAmount, usdcAmount, price);

        vm.prank(oracle);
        hub.openPosition(alice, marketId, YES, usdcAmount, tokenAmount, price);
    }

    function test_OpenPosition_MultiplePositions() public {
        vm.prank(alice);
        hub.deposit(500 * USDC_UNIT);

        vm.startPrank(oracle);
        uint256 pos1 = hub.openPosition(alice, marketId, YES, 65 * USDC_UNIT, 100 * USDC_UNIT, 6500);
        uint256 pos2 = hub.openPosition(alice, marketId, NO, 35 * USDC_UNIT, 100 * USDC_UNIT, 3500);
        vm.stopPrank();

        assertEq(pos1, 1);
        assertEq(pos2, 2);

        uint256[] memory ids = hub.getUserPositionIds(alice);
        assertEq(ids.length, 2);
    }

    function test_RevertWhen_OpenPosition_NotOwner() public {
        vm.prank(alice);
        hub.deposit(1000 * USDC_UNIT);

        vm.prank(alice);
        vm.expectRevert();
        hub.openPosition(alice, marketId, YES, 65 * USDC_UNIT, 100 * USDC_UNIT, 6500);
    }

    function test_RevertWhen_OpenPosition_ZeroAmount() public {
        vm.prank(alice);
        hub.deposit(1000 * USDC_UNIT);

        vm.prank(oracle);
        vm.expectRevert(TradingHub.InvalidAmount.selector);
        hub.openPosition(alice, marketId, YES, 0, 100 * USDC_UNIT, 6500);
    }

    function test_RevertWhen_OpenPosition_ZeroTokens() public {
        vm.prank(alice);
        hub.deposit(1000 * USDC_UNIT);

        vm.prank(oracle);
        vm.expectRevert(TradingHub.InvalidAmount.selector);
        hub.openPosition(alice, marketId, YES, 65 * USDC_UNIT, 0, 6500);
    }

    function test_RevertWhen_OpenPosition_InvalidOutcome() public {
        vm.prank(alice);
        hub.deposit(1000 * USDC_UNIT);

        vm.prank(oracle);
        vm.expectRevert(TradingHub.InvalidOutcome.selector);
        hub.openPosition(alice, marketId, 2, 65 * USDC_UNIT, 100 * USDC_UNIT, 6500);
    }

    function test_RevertWhen_OpenPosition_InsufficientBalance() public {
        vm.prank(alice);
        hub.deposit(10 * USDC_UNIT);

        vm.prank(oracle);
        vm.expectRevert(TradingHub.InsufficientBalance.selector);
        hub.openPosition(alice, marketId, YES, 65 * USDC_UNIT, 100 * USDC_UNIT, 6500);
    }

    function test_RevertWhen_OpenPosition_MarketResolved() public {
        vm.prank(oracle);
        hub.resolveMarket(marketId, YES);

        vm.prank(alice);
        hub.deposit(1000 * USDC_UNIT);

        vm.prank(oracle);
        vm.expectRevert(TradingHub.MarketNotActive.selector);
        hub.openPosition(alice, marketId, YES, 65 * USDC_UNIT, 100 * USDC_UNIT, 6500);
    }

    // ============================================================
    //                      ClosePosition
    // ============================================================

    function test_ClosePosition() public {
        vm.prank(alice);
        hub.deposit(1000 * USDC_UNIT);

        vm.prank(oracle);
        uint256 posId = hub.openPosition(alice, marketId, YES, 65 * USDC_UNIT, 100 * USDC_UNIT, 6500);

        // 平仓: 价格涨到 80%，返还 80 USDC
        uint256 returnUsdc = 80 * USDC_UNIT;
        uint256 closePrice = 8000;

        vm.prank(oracle);
        hub.closePosition(posId, returnUsdc, closePrice);

        // 验证余额恢复 (1000 - 65 + 80 = 1015)
        assertEq(hub.userBalances(alice), 1000 * USDC_UNIT - 65 * USDC_UNIT + returnUsdc);

        // ERC1155 应该被烧掉
        uint256 tokenId = hub.getTokenId(marketId, YES);
        assertEq(hub.balanceOf(alice, tokenId), 0);

        // marketTotalLocked 应该减少
        assertEq(hub.marketTotalLocked(marketId), 0);
    }

    function test_ClosePosition_EmitsEvent() public {
        vm.prank(alice);
        hub.deposit(1000 * USDC_UNIT);

        vm.prank(oracle);
        uint256 posId = hub.openPosition(alice, marketId, YES, 65 * USDC_UNIT, 100 * USDC_UNIT, 6500);

        uint256 returnUsdc = 80 * USDC_UNIT;
        uint256 closePrice = 8000;

        vm.expectEmit(true, true, true, true);
        emit TradingHub.PositionClosed(posId, alice, marketId, YES, 100 * USDC_UNIT, returnUsdc, closePrice);

        vm.prank(oracle);
        hub.closePosition(posId, returnUsdc, closePrice);
    }

    function test_ClosePosition_WithLoss() public {
        vm.prank(alice);
        hub.deposit(1000 * USDC_UNIT);

        vm.prank(oracle);
        uint256 posId = hub.openPosition(alice, marketId, YES, 65 * USDC_UNIT, 100 * USDC_UNIT, 6500);

        // 亏损平仓: 价格跌到 40%，返还 40 USDC
        vm.prank(oracle);
        hub.closePosition(posId, 40 * USDC_UNIT, 4000);

        assertEq(hub.userBalances(alice), 1000 * USDC_UNIT - 65 * USDC_UNIT + 40 * USDC_UNIT);
    }

    function test_RevertWhen_ClosePosition_NotOwner() public {
        vm.prank(alice);
        hub.deposit(1000 * USDC_UNIT);

        vm.prank(oracle);
        uint256 posId = hub.openPosition(alice, marketId, YES, 65 * USDC_UNIT, 100 * USDC_UNIT, 6500);

        vm.prank(alice);
        vm.expectRevert();
        hub.closePosition(posId, 80 * USDC_UNIT, 8000);
    }

    function test_RevertWhen_ClosePosition_NotFound() public {
        vm.prank(oracle);
        vm.expectRevert(TradingHub.PositionNotFound.selector);
        hub.closePosition(999, 80 * USDC_UNIT, 8000);
    }

    function test_RevertWhen_ClosePosition_AlreadyClosed() public {
        vm.prank(alice);
        hub.deposit(1000 * USDC_UNIT);

        vm.startPrank(oracle);
        uint256 posId = hub.openPosition(alice, marketId, YES, 65 * USDC_UNIT, 100 * USDC_UNIT, 6500);
        hub.closePosition(posId, 80 * USDC_UNIT, 8000);

        vm.expectRevert(TradingHub.PositionNotOpen.selector);
        hub.closePosition(posId, 80 * USDC_UNIT, 8000);
        vm.stopPrank();
    }

    function test_RevertWhen_ClosePosition_MarketResolved() public {
        vm.prank(alice);
        hub.deposit(1000 * USDC_UNIT);

        vm.prank(oracle);
        uint256 posId = hub.openPosition(alice, marketId, YES, 65 * USDC_UNIT, 100 * USDC_UNIT, 6500);

        vm.prank(oracle);
        hub.resolveMarket(marketId, YES);

        vm.prank(oracle);
        vm.expectRevert(TradingHub.MarketNotActive.selector);
        hub.closePosition(posId, 100 * USDC_UNIT, 10000);
    }

    // ============================================================
    //                      FundReserve
    // ============================================================

    function test_FundReserve() public {
        // oracle mint USDC 并 approve
        vm.warp(block.timestamp + 2 hours);
        usdc.mint(oracle, 5000 * USDC_UNIT);
        vm.startPrank(oracle);
        usdc.approve(address(hub), type(uint256).max);

        uint256 fundAmount = 1000 * USDC_UNIT;
        hub.fundReserve(fundAmount);
        vm.stopPrank();

        assertEq(usdc.balanceOf(address(hub)), fundAmount);
    }

    function test_FundReserve_EmitsEvent() public {
        vm.warp(block.timestamp + 2 hours);
        usdc.mint(oracle, 5000 * USDC_UNIT);
        vm.startPrank(oracle);
        usdc.approve(address(hub), type(uint256).max);

        vm.expectEmit(true, false, false, true);
        emit TradingHub.ReserveFunded(oracle, 1000 * USDC_UNIT);

        hub.fundReserve(1000 * USDC_UNIT);
        vm.stopPrank();
    }

    function test_RevertWhen_FundReserve_NotOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        hub.fundReserve(1000 * USDC_UNIT);
    }

    function test_RevertWhen_FundReserve_ZeroAmount() public {
        vm.prank(oracle);
        vm.expectRevert(TradingHub.InvalidAmount.selector);
        hub.fundReserve(0);
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

    function test_Redeem_WinningTokens() public {
        // alice deposit → oracle 开仓 YES → oracle 结算 YES → alice 赎回
        vm.prank(alice);
        hub.deposit(100 * USDC_UNIT);

        vm.prank(oracle);
        hub.openPosition(alice, marketId, YES, 65 * USDC_UNIT, 100 * USDC_UNIT, 6500);

        vm.prank(oracle);
        hub.resolveMarket(marketId, YES);

        uint256 balanceBefore = hub.userBalances(alice);

        vm.prank(alice);
        hub.redeem(marketId);

        // 100 tokens → 100 USDC 加回余额
        assertEq(hub.userBalances(alice), balanceBefore + 100 * USDC_UNIT);

        // ERC1155 应该被烧掉
        uint256 tokenId = hub.getTokenId(marketId, YES);
        assertEq(hub.balanceOf(alice, tokenId), 0);
    }

    function test_Redeem_EmitsEvent() public {
        vm.prank(alice);
        hub.deposit(100 * USDC_UNIT);

        vm.prank(oracle);
        hub.openPosition(alice, marketId, YES, 65 * USDC_UNIT, 100 * USDC_UNIT, 6500);

        vm.prank(oracle);
        hub.resolveMarket(marketId, YES);

        vm.expectEmit(true, true, false, true);
        emit TradingHub.Redemption(alice, marketId, 100 * USDC_UNIT, 100 * USDC_UNIT);

        vm.prank(alice);
        hub.redeem(marketId);
    }

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

    function test_RevertWhen_Redeem_LosingOutcome() public {
        // alice 买 NO，但 YES 赢了
        vm.prank(alice);
        hub.deposit(100 * USDC_UNIT);

        vm.prank(oracle);
        hub.openPosition(alice, marketId, NO, 35 * USDC_UNIT, 100 * USDC_UNIT, 3500);

        vm.prank(oracle);
        hub.resolveMarket(marketId, YES);

        // alice 没有 YES tokens，无法赎回
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

        assertTrue(yesId != noId);
        assertEq(yesId, hub.getTokenId(marketId, YES));
    }

    function test_GetUserPositionIds() public {
        vm.prank(alice);
        hub.deposit(500 * USDC_UNIT);

        vm.startPrank(oracle);
        hub.openPosition(alice, marketId, YES, 65 * USDC_UNIT, 100 * USDC_UNIT, 6500);
        hub.openPosition(alice, marketId, NO, 35 * USDC_UNIT, 100 * USDC_UNIT, 3500);
        vm.stopPrank();

        uint256[] memory ids = hub.getUserPositionIds(alice);
        assertEq(ids.length, 2);
        assertEq(ids[0], 1);
        assertEq(ids[1], 2);
    }

    function test_GetUserOpenPositions() public {
        vm.prank(alice);
        hub.deposit(500 * USDC_UNIT);

        vm.startPrank(oracle);
        hub.openPosition(alice, marketId, YES, 65 * USDC_UNIT, 100 * USDC_UNIT, 6500);
        uint256 pos2 = hub.openPosition(alice, marketId, NO, 35 * USDC_UNIT, 100 * USDC_UNIT, 3500);
        hub.closePosition(pos2, 30 * USDC_UNIT, 3000);
        vm.stopPrank();

        TradingHub.Position[] memory open = hub.getUserOpenPositions(alice);
        assertEq(open.length, 1);
        assertEq(open[0].id, 1);
        assertEq(open[0].outcome, YES);
        assertTrue(open[0].isOpen);
    }

    // ============================================================
    //                    全生命周期测试
    // ============================================================

    function test_FullLifecycle_WinYes() public {
        // 1. alice deposit 1000 USDC
        vm.prank(alice);
        hub.deposit(1000 * USDC_UNIT);

        // 2. oracle 为 alice 开仓 YES @ 65%
        vm.prank(oracle);
        hub.openPosition(alice, marketId, YES, 65 * USDC_UNIT, 100 * USDC_UNIT, 6500);

        assertEq(hub.userBalances(alice), 935 * USDC_UNIT);

        // 2.5 oracle 补充储备金（覆盖赎回差额）
        vm.warp(block.timestamp + 2 hours);
        usdc.mint(oracle, 500 * USDC_UNIT);
        vm.startPrank(oracle);
        usdc.approve(address(hub), type(uint256).max);
        hub.fundReserve(500 * USDC_UNIT);
        vm.stopPrank();

        // 3. 市场结算: YES 赢
        vm.prank(oracle);
        hub.resolveMarket(marketId, YES);

        // 4. alice 赎回: 100 tokens → 100 USDC
        vm.prank(alice);
        hub.redeem(marketId);

        // 935 + 100 = 1035 USDC（净利润 35）
        assertEq(hub.userBalances(alice), 1035 * USDC_UNIT);

        // 5. alice 提现
        vm.prank(alice);
        hub.withdraw(1035 * USDC_UNIT);

        assertEq(hub.userBalances(alice), 0);
        assertEq(usdc.balanceOf(alice), 10_000 * USDC_UNIT - 1000 * USDC_UNIT + 1035 * USDC_UNIT);
    }

    function test_FullLifecycle_CloseBeforeResolve() public {
        // 1. alice deposit
        vm.prank(alice);
        hub.deposit(1000 * USDC_UNIT);

        // 2. 开仓 YES @ 65%
        vm.prank(oracle);
        uint256 posId = hub.openPosition(alice, marketId, YES, 65 * USDC_UNIT, 100 * USDC_UNIT, 6500);

        // 2.5 oracle 补充储备金
        vm.warp(block.timestamp + 2 hours);
        usdc.mint(oracle, 500 * USDC_UNIT);
        vm.startPrank(oracle);
        usdc.approve(address(hub), type(uint256).max);
        hub.fundReserve(500 * USDC_UNIT);
        vm.stopPrank();

        // 3. 价格涨到 80%，平仓获利
        vm.prank(oracle);
        hub.closePosition(posId, 80 * USDC_UNIT, 8000);

        // 935 + 80 = 1015（净利润 15）
        assertEq(hub.userBalances(alice), 1015 * USDC_UNIT);

        // 4. 提现
        vm.prank(alice);
        hub.withdraw(1015 * USDC_UNIT);

        assertEq(usdc.balanceOf(alice), 10_000 * USDC_UNIT - 1000 * USDC_UNIT + 1015 * USDC_UNIT);
    }

    function test_FullLifecycle_LoseNo() public {
        // bob 买 NO @ 35%, YES 赢了 → bob 输
        vm.prank(bob);
        hub.deposit(500 * USDC_UNIT);

        vm.prank(oracle);
        hub.openPosition(bob, marketId, NO, 35 * USDC_UNIT, 100 * USDC_UNIT, 3500);

        vm.prank(oracle);
        hub.resolveMarket(marketId, YES);

        // bob 无法赎回（NO tokens 不是 winning outcome）
        vm.prank(bob);
        vm.expectRevert(TradingHub.NoWinningTokens.selector);
        hub.redeem(marketId);

        // 余额 = 500 - 35 = 465 USDC
        assertEq(hub.userBalances(bob), 465 * USDC_UNIT);
    }

    // ============================================================
    //                  资金不变量检查
    // ============================================================

    function test_Invariant_ContractBalanceCoversUserBalances() public {
        vm.prank(alice);
        hub.deposit(500 * USDC_UNIT);

        vm.prank(bob);
        hub.deposit(300 * USDC_UNIT);

        vm.startPrank(oracle);
        hub.openPosition(alice, marketId, YES, 65 * USDC_UNIT, 100 * USDC_UNIT, 6500);
        hub.openPosition(bob, marketId, NO, 35 * USDC_UNIT, 100 * USDC_UNIT, 3500);
        vm.stopPrank();

        uint256 contractBalance = usdc.balanceOf(address(hub));
        uint256 totalUserBalances = hub.userBalances(alice) + hub.userBalances(bob);

        // 合约 USDC 余额 >= 用户可提现余额
        assertGe(contractBalance, totalUserBalances);
    }

    // ============================================================
    //                  ERC1155 兼容性
    // ============================================================

    function test_SupportsInterface() public view {
        // ERC1155 interface
        assertTrue(hub.supportsInterface(0xd9b67a26));
        // ERC1155 Receiver interface
        assertTrue(hub.supportsInterface(0x4e2312e0));
    }
}

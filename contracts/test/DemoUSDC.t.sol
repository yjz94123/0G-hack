// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/DemoUSDC.sol";

contract DemoUSDCTest is Test {
    DemoUSDC public token;
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    function setUp() public {
        token = new DemoUSDC();
    }

    // ============ 基础属性 ============

    function test_Name() public view {
        assertEq(token.name(), "DemoUSDC");
    }

    function test_Symbol() public view {
        assertEq(token.symbol(), "dUSDC");
    }

    function test_Decimals() public view {
        assertEq(token.decimals(), 6);
    }

    // ============ Mint ============

    function test_Mint() public {
        uint256 amount = 5000 * 1e6;
        vm.prank(alice);
        token.mint(bob, amount);

        assertEq(token.balanceOf(bob), amount);
        assertEq(token.totalSupply(), amount);
    }

    function test_Mint_MaxAmount() public {
        vm.prank(alice);
        token.mint(alice, token.MAX_MINT_AMOUNT());
        assertEq(token.balanceOf(alice), token.MAX_MINT_AMOUNT());
    }

    function test_RevertWhen_MintExceedsMax() public {
        uint256 tooMuch = token.MAX_MINT_AMOUNT() + 1;
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(DemoUSDC.MintAmountExceeded.selector, tooMuch, token.MAX_MINT_AMOUNT())
        );
        token.mint(alice, tooMuch);
    }

    function test_RevertWhen_MintToZeroAddress() public {
        vm.prank(alice);
        vm.expectRevert(DemoUSDC.ZeroAddress.selector);
        token.mint(address(0), 1000 * 1e6);
    }

    function test_RevertWhen_MintCooldown() public {
        vm.startPrank(alice);
        token.mint(alice, 1000 * 1e6);

        // 立即再次 mint 应该失败
        vm.expectRevert(); // MintCooldownActive
        token.mint(alice, 1000 * 1e6);
        vm.stopPrank();
    }

    function test_MintAfterCooldown() public {
        vm.startPrank(alice);
        token.mint(alice, 1000 * 1e6);

        // 前进 1 小时
        vm.warp(block.timestamp + 1 hours);
        token.mint(alice, 2000 * 1e6);

        assertEq(token.balanceOf(alice), 3000 * 1e6);
        vm.stopPrank();
    }

    // ============ Faucet ============

    function test_Faucet() public {
        vm.prank(alice);
        token.faucet();
        assertEq(token.balanceOf(alice), token.FAUCET_AMOUNT());
    }

    function test_RevertWhen_FaucetCooldown() public {
        vm.startPrank(alice);
        token.faucet();

        vm.expectRevert(); // MintCooldownActive
        token.faucet();
        vm.stopPrank();
    }

    function test_FaucetAfterCooldown() public {
        vm.startPrank(alice);
        token.faucet();

        vm.warp(block.timestamp + 1 hours);
        token.faucet();

        assertEq(token.balanceOf(alice), token.FAUCET_AMOUNT() * 2);
        vm.stopPrank();
    }

    // ============ ERC20 标准 ============

    function test_Transfer() public {
        vm.prank(alice);
        token.faucet();

        uint256 transferAmount = 500 * 1e6;
        vm.prank(alice);
        token.transfer(bob, transferAmount);

        assertEq(token.balanceOf(alice), token.FAUCET_AMOUNT() - transferAmount);
        assertEq(token.balanceOf(bob), transferAmount);
    }

    function test_Approve_TransferFrom() public {
        vm.prank(alice);
        token.faucet();

        uint256 allowanceAmount = 300 * 1e6;
        vm.prank(alice);
        token.approve(bob, allowanceAmount);

        vm.prank(bob);
        token.transferFrom(alice, bob, allowanceAmount);

        assertEq(token.balanceOf(bob), allowanceAmount);
    }
}

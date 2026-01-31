// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/USDC.sol";

contract USDCTest is Test {
    USDC public usdc;
    address public user1;
    address public user2;

    function setUp() public {
        usdc = new USDC();
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
    }

    function test_Decimals() public view {
        assertEq(usdc.decimals(), 6);
    }

    function test_Name() public view {
        assertEq(usdc.name(), "USD Coin");
    }

    function test_Symbol() public view {
        assertEq(usdc.symbol(), "USDC");
    }

    function test_Mint() public {
        uint256 amount = 1000 * 1e6; // 1000 USDC
        
        vm.prank(user1);
        usdc.mint(user1, amount);
        
        assertEq(usdc.balanceOf(user1), amount);
    }

    function test_MintMaxAmount() public {
        uint256 maxAmount = usdc.MAX_MINT_AMOUNT();
        
        vm.prank(user1);
        usdc.mint(user1, maxAmount);
        
        assertEq(usdc.balanceOf(user1), maxAmount);
    }

    function test_RevertWhen_MintExceedsMax() public {
        uint256 amount = usdc.MAX_MINT_AMOUNT() + 1;
        
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(USDC.MintAmountExceeded.selector, amount, usdc.MAX_MINT_AMOUNT()));
        usdc.mint(user1, amount);
    }

    function test_RevertWhen_MintCooldownNotPassed() public {
        uint256 amount = 1000 * 1e6;
        
        vm.startPrank(user1);
        usdc.mint(user1, amount);
        
        // 尝试立即再次铸造
        vm.expectRevert();
        usdc.mint(user1, amount);
        vm.stopPrank();
    }

    function test_MintAfterCooldown() public {
        uint256 amount = 1000 * 1e6;
        
        vm.startPrank(user1);
        usdc.mint(user1, amount);
        
        // 等待冷却时间
        vm.warp(block.timestamp + usdc.MINT_COOLDOWN() + 1);
        
        usdc.mint(user1, amount);
        vm.stopPrank();
        
        assertEq(usdc.balanceOf(user1), amount * 2);
    }

    function test_MintUnlimited() public {
        uint256 amount = 1_000_000 * 1e6; // 1M USDC
        
        usdc.mintUnlimited(user1, amount);
        
        assertEq(usdc.balanceOf(user1), amount);
    }

    function test_Transfer() public {
        uint256 amount = 1000 * 1e6;
        
        usdc.mintUnlimited(user1, amount);
        
        vm.prank(user1);
        usdc.transfer(user2, amount);
        
        assertEq(usdc.balanceOf(user1), 0);
        assertEq(usdc.balanceOf(user2), amount);
    }
}

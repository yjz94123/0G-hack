// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title USDC
/// @notice 测试用 USDC 代币，任何人可铸造
/// @dev 仅用于测试网环境
contract USDC is ERC20 {
    uint8 private constant DECIMALS = 6;

    /// @notice 单次铸造上限: 10,000 USDC
    uint256 public constant MAX_MINT_AMOUNT = 10_000 * 10 ** DECIMALS;

    /// @notice 每个地址的铸造冷却时间: 1小时
    uint256 public constant MINT_COOLDOWN = 1 hours;

    /// @notice 记录每个地址上次铸造时间
    mapping(address => uint256) public lastMintTime;

    error MintAmountExceeded(uint256 requested, uint256 maximum);
    error MintCooldownNotPassed(uint256 remainingTime);

    constructor() ERC20("USD Coin", "USDC") {}

    /// @notice 返回代币精度 (6位，与真实USDC一致)
    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    /// @notice 铸造测试代币 (有数量和冷却限制)
    /// @param to 接收地址
    /// @param amount 铸造数量
    function mint(address to, uint256 amount) external {
        if (amount > MAX_MINT_AMOUNT) {
            revert MintAmountExceeded(amount, MAX_MINT_AMOUNT);
        }

        uint256 lastMint = lastMintTime[msg.sender];
        if (lastMint != 0) {
            uint256 timeSinceLastMint = block.timestamp - lastMint;
            if (timeSinceLastMint < MINT_COOLDOWN) {
                revert MintCooldownNotPassed(MINT_COOLDOWN - timeSinceLastMint);
            }
        }

        lastMintTime[msg.sender] = block.timestamp;
        _mint(to, amount);
    }

    /// @notice 无限制铸造 (仅用于测试脚本)
    /// @param to 接收地址
    /// @param amount 铸造数量
    function mintUnlimited(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

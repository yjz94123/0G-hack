// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title DemoUSDC
 * @notice 测试用 USDC 代币，任何人可 mint（带冷却），支持 faucet
 */
contract DemoUSDC is ERC20 {
    uint8 private constant _DECIMALS = 6;

    /// @notice 单次 mint 上限: 10,000 dUSDC
    uint256 public constant MAX_MINT_AMOUNT = 10_000 * 10 ** _DECIMALS;

    /// @notice faucet 每次发放: 1,000 dUSDC
    uint256 public constant FAUCET_AMOUNT = 1_000 * 10 ** _DECIMALS;

    /// @notice mint 冷却时间: 1 小时
    uint256 public constant MINT_COOLDOWN = 1 hours;

    /// @notice 记录每个地址上次 mint 的时间
    mapping(address => uint256) public lastMintTime;

    // ============ Custom Errors ============

    error MintAmountExceeded(uint256 requested, uint256 maximum);
    error MintCooldownActive(address account, uint256 availableAt);
    error ZeroAddress();

    // ============ Constructor ============

    constructor() ERC20("DemoUSDC", "dUSDC") {}

    // ============ Public Functions ============

    function decimals() public pure override returns (uint8) {
        return _DECIMALS;
    }

    /**
     * @notice 铸造代币给指定地址
     * @param to     接收地址
     * @param amount 铸造数量
     */
    function mint(address to, uint256 amount) external {
        if (to == address(0)) revert ZeroAddress();
        if (amount > MAX_MINT_AMOUNT) revert MintAmountExceeded(amount, MAX_MINT_AMOUNT);
        _checkAndUpdateCooldown(msg.sender);
        _mint(to, amount);
    }

    /**
     * @notice 水龙头 — 给 msg.sender 铸造 1,000 dUSDC
     */
    function faucet() external {
        _checkAndUpdateCooldown(msg.sender);
        _mint(msg.sender, FAUCET_AMOUNT);
    }

    // ============ Internal ============

    function _checkAndUpdateCooldown(address account) internal {
        uint256 lastMint = lastMintTime[account];
        if (lastMint != 0) {
            uint256 nextAvailable = lastMint + MINT_COOLDOWN;
            if (block.timestamp < nextAvailable) {
                revert MintCooldownActive(account, nextAvailable);
            }
        }
        // 存储 max(block.timestamp, 1)，保证 0 保留为"从未铸造"
        lastMintTime[account] = block.timestamp > 0 ? block.timestamp : 1;
    }
}

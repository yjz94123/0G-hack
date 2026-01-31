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
 * @notice 预测市场交易枢纽 — ERC1155 结果代币 + 代理镜像交易 + 内置金库
 * @dev 安全措施：ReentrancyGuard, SafeERC20, CEI 模式, Custom Errors
 *
 * 镜像交易模式：
 *   用户 deposit USDC → 后端读取 Polymarket 价格 → owner 调用 openPosition 铸造代币
 *   市场结算后: 1 获胜代币 = 1 USDC
 */
contract TradingHub is ERC1155, ERC1155Holder, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============================================================
    //                         常量
    // ============================================================

    uint8 public constant OUTCOME_NO = 0;
    uint8 public constant OUTCOME_YES = 1;

    // ============================================================
    //                       不可变量
    // ============================================================

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

    struct Position {
        uint256 id;
        address user;
        bytes32 marketId;
        uint8 outcome;       // 0=NO, 1=YES
        uint256 tokenAmount; // ERC1155 代币数量 (USDC 精度, 1e6)
        uint256 costUsdc;    // 开仓花费的 USDC
        uint256 priceAtOpen; // 开仓价格（基点, 6500 = 65%）
        uint256 openedAt;
        bool isOpen;
    }

    // ============================================================
    //                       状态变量
    // ============================================================

    uint256 public nextPositionId = 1;

    mapping(address => uint256) public userBalances;
    mapping(uint256 => Position) public positions;
    mapping(address => uint256[]) private _userPositionIds;
    mapping(bytes32 => Market) public markets;
    mapping(bytes32 => uint256) public marketTotalLocked;

    // ============================================================
    //                       Custom Errors
    // ============================================================

    error InvalidAmount();
    error InvalidOutcome();
    error InsufficientBalance();
    error MarketNotActive();
    error MarketAlreadyResolved();
    error MarketNotResolved();
    error NoWinningTokens();
    error PositionNotFound();
    error PositionNotOpen();

    // ============================================================
    //                         事件
    // ============================================================

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event PositionOpened(
        uint256 indexed positionId,
        address indexed user,
        bytes32 indexed marketId,
        uint8 outcome,
        uint256 tokenAmount,
        uint256 costUsdc,
        uint256 priceAtOpen
    );
    event PositionClosed(
        uint256 indexed positionId,
        address indexed user,
        bytes32 indexed marketId,
        uint8 outcome,
        uint256 tokenAmount,
        uint256 returnUsdc,
        uint256 priceAtClose
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
    event ReserveFunded(address indexed funder, uint256 amount);

    // ============================================================
    //                       构造函数
    // ============================================================

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

    function deposit(uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();
        userBalances[msg.sender] += amount;
        demoUSDC.safeTransferFrom(msg.sender, address(this), amount);
        emit Deposit(msg.sender, amount);
    }

    function withdraw(uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();
        if (userBalances[msg.sender] < amount) revert InsufficientBalance();
        userBalances[msg.sender] -= amount;
        demoUSDC.safeTransfer(msg.sender, amount);
        emit Withdraw(msg.sender, amount);
    }

    // ============================================================
    //                 代理交易 (Proxy Trading)
    // ============================================================

    // 为用户开仓（仅 owner/后端 可调用）
    function openPosition(
        address user,
        bytes32 marketId,
        uint8 outcome,
        uint256 usdcAmount,
        uint256 tokenAmount,
        uint256 price
    ) external onlyOwner nonReentrant returns (uint256 positionId) {
        if (markets[marketId].status != MarketStatus.Active) revert MarketNotActive();
        if (usdcAmount == 0 || tokenAmount == 0) revert InvalidAmount();
        if (outcome > 1) revert InvalidOutcome();
        if (userBalances[user] < usdcAmount) revert InsufficientBalance();

        positionId = nextPositionId++;

        userBalances[user] -= usdcAmount;
        marketTotalLocked[marketId] += tokenAmount;

        positions[positionId] = Position({
            id: positionId,
            user: user,
            marketId: marketId,
            outcome: outcome,
            tokenAmount: tokenAmount,
            costUsdc: usdcAmount,
            priceAtOpen: price,
            openedAt: block.timestamp,
            isOpen: true
        });
        _userPositionIds[user].push(positionId);

        uint256 tokenId = getTokenId(marketId, outcome);
        _mint(user, tokenId, tokenAmount, "");

        emit PositionOpened(positionId, user, marketId, outcome, tokenAmount, usdcAmount, price);
    }

    // 为用户平仓（仅 owner/后端 可调用）
    function closePosition(
        uint256 positionId,
        uint256 returnUsdc,
        uint256 priceAtClose
    ) external onlyOwner nonReentrant {
        Position storage pos = positions[positionId];
        if (pos.id == 0) revert PositionNotFound();
        if (!pos.isOpen) revert PositionNotOpen();
        if (markets[pos.marketId].status != MarketStatus.Active) revert MarketNotActive();

        pos.isOpen = false;

        address user = pos.user;
        uint256 tokenAmount = pos.tokenAmount;
        bytes32 mktId = pos.marketId;
        uint8 outcome = pos.outcome;

        userBalances[user] += returnUsdc;

        if (marketTotalLocked[mktId] >= tokenAmount) {
            marketTotalLocked[mktId] -= tokenAmount;
        }

        uint256 tokenId = getTokenId(mktId, outcome);
        _burn(user, tokenId, tokenAmount);

        emit PositionClosed(positionId, user, mktId, outcome, tokenAmount, returnUsdc, priceAtClose);
    }

    // owner 补充储备金（应对赎回差额）
    function fundReserve(uint256 amount) external onlyOwner nonReentrant {
        if (amount == 0) revert InvalidAmount();
        demoUSDC.safeTransferFrom(msg.sender, address(this), amount);
        emit ReserveFunded(msg.sender, amount);
    }

    // ============================================================
    //                   市场结算 (Resolution)
    // ============================================================

    function resolveMarket(bytes32 marketId, uint8 winningOutcome) external onlyOwner {
        if (markets[marketId].status != MarketStatus.Active) revert MarketAlreadyResolved();
        if (winningOutcome > 1) revert InvalidOutcome();
        markets[marketId].status = MarketStatus.Resolved;
        markets[marketId].winningOutcome = winningOutcome;
        markets[marketId].resolvedAt = block.timestamp;
        emit MarketResolved(marketId, winningOutcome, block.timestamp);
    }

    function redeem(bytes32 marketId) external nonReentrant {
        if (markets[marketId].status != MarketStatus.Resolved) revert MarketNotResolved();

        uint8 winningOutcome = markets[marketId].winningOutcome;
        uint256 tokenId = getTokenId(marketId, winningOutcome);
        uint256 tokenBalance = balanceOf(msg.sender, tokenId);

        if (tokenBalance == 0) revert NoWinningTokens();

        _burn(msg.sender, tokenId, tokenBalance);
        userBalances[msg.sender] += tokenBalance;

        if (marketTotalLocked[marketId] >= tokenBalance) {
            marketTotalLocked[marketId] -= tokenBalance;
        }

        emit Redemption(msg.sender, marketId, tokenBalance, tokenBalance);
    }

    // ============================================================
    //                       视图函数
    // ============================================================

    function getTokenId(bytes32 marketId, uint8 outcome) public pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(marketId, outcome)));
    }

    function getMarketStatus(bytes32 marketId)
        external
        view
        returns (MarketStatus status, uint8 winningOutcome, uint256 resolvedAt)
    {
        Market memory m = markets[marketId];
        return (m.status, m.winningOutcome, m.resolvedAt);
    }

    function getUserPositionIds(address user) external view returns (uint256[] memory) {
        return _userPositionIds[user];
    }

    function getUserOpenPositions(address user) external view returns (Position[] memory) {
        uint256[] memory ids = _userPositionIds[user];
        uint256 count = 0;
        for (uint256 i = 0; i < ids.length; i++) {
            if (positions[ids[i]].isOpen) count++;
        }
        Position[] memory openPositions = new Position[](count);
        uint256 j = 0;
        for (uint256 i = 0; i < ids.length; i++) {
            if (positions[ids[i]].isOpen) {
                openPositions[j++] = positions[ids[i]];
            }
        }
        return openPositions;
    }
}

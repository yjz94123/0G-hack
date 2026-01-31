// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/DemoUSDC.sol";
import "../src/TradingHub.sol";

/**
 * @title Deploy
 * @notice 部署 DemoUSDC 和 TradingHub 到 0G 测试网
 *
 * 使用方式:
 *   forge script script/Deploy.s.sol:Deploy \
 *     --rpc-url og_testnet \
 *     --broadcast \
 *     --private-key $DEPLOYER_PRIVATE_KEY
 */
contract Deploy is Script {
    function run() external {
        // Oracle 地址 = 部署者地址（可在部署后 transferOwnership）
        address oracle = msg.sender;

        vm.startBroadcast();

        // 1. 部署 DemoUSDC
        DemoUSDC demoUSDC = new DemoUSDC();
        console.log("DemoUSDC deployed at:", address(demoUSDC));

        // 2. 部署 TradingHub
        TradingHub tradingHub = new TradingHub(address(demoUSDC), oracle);
        console.log("TradingHub deployed at:", address(tradingHub));
        console.log("Oracle (owner):", oracle);

        vm.stopBroadcast();

        // 输出环境变量配置
        console.log("");
        console.log("=== Add to backend/.env ===");
        console.log("DEMO_USDC_ADDRESS=%s", address(demoUSDC));
        console.log("TRADING_HUB_ADDRESS=%s", address(tradingHub));
    }
}

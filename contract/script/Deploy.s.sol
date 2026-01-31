// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/USDC.sol";
import "../src/TradingHub.sol";

contract DeployScript is Script {
    function run() external {
        vm.startBroadcast();

        // 1. 部署 USDC
        USDC usdc = new USDC();
        console.log("USDC deployed at:", address(usdc));

        // 2. 部署 TradingHub
        TradingHub tradingHub = new TradingHub(address(usdc));
        console.log("TradingHub deployed at:", address(tradingHub));

        vm.stopBroadcast();

        // 输出部署信息
        console.log("\n=== Deployment Summary ===");
        console.log("USDC_ADDRESS=%s", address(usdc));
        console.log("TRADING_HUB_ADDRESS=%s", address(tradingHub));
    }
}

const hre = require("hardhat");

async function main() {
    const signers = await hre.ethers.getSigners();
    if (signers.length === 0) {
        throw new Error("❌ No deployer account found! Please check your .env file and ensure PRIVATE_KEY is set.");
    }
    const deployer = signers[0];

    console.log("Deploying contracts with the account:", deployer.address);

    // Default to a mock or specific address if not provided in env
    let usdcAddress = process.env.USDC_ADDRESS;

    // Auto-configure Native USDC for Base Mainnet
    if (hre.network.name === "base") {
        console.log("🌍 Directing to Base Mainnet Native USDC...");
        usdcAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    }

    if (!usdcAddress) {
        console.log("⚠️ No USDC_ADDRESS provided. Deploying MockUSDC for testing...");
        const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
        const usdc = await MockUSDC.deploy();
        await usdc.waitForDeployment();
        usdcAddress = await usdc.getAddress();
        console.log("MockUSDC deployed to:", usdcAddress);
    }

    const Escrow = await hre.ethers.getContractFactory("Escrow");
    // Deploy Escrow (No arguments needed for V2)
    const escrow = await Escrow.deploy();

    await escrow.waitForDeployment();

    const escrowAddress = await escrow.getAddress();
    console.log(`✅ Escrow deployed to: ${escrowAddress}`);

    // Update frontend addresses
    const fs = require("fs");
    const path = require("path");
    const addressesFile = path.join(__dirname, "../src/contracts/addresses.json");

    const addresses = {
        Escrow: escrowAddress,
        USDC: usdcAddress,
        "8453": {
            "Escrow": escrowAddress,
            "USDC": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            "USDT": "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
            "ETH": "0x0000000000000000000000000000000000000000"
        }
    };

    fs.writeFileSync(addressesFile, JSON.stringify(addresses, null, 4));
    console.log("✅ Updated src/contracts/addresses.json");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

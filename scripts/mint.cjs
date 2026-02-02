const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    const usdcAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const MockUSDC = await hre.ethers.getContractAt("MockUSDC", usdcAddress);

    const amount = hre.ethers.parseUnits("1000", 6);
    await MockUSDC.mint(deployer.address, amount);

    console.log(`✅ Minted 1000 USDC to ${deployer.address}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

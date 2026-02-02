const hre = require("hardhat");
async function main() {
    try {
        const block = await hre.ethers.provider.getBlockNumber();
        console.log("CURRENT_BLOCK:", block);
    } catch (e) {
        console.error(e);
    }
}
main();

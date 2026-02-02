const { expect } = require("chai");
const hre = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Escrow (Production)", function () {
    let escrow;
    let usdc;
    let buyer, seller, arbiter;

    const ETH = "0x0000000000000000000000000000000000000000";
    const MIN = 1000000n;
    const ACC_PERIOD = 30 * 24 * 60 * 60;
    const DEL_PERIOD = 14 * 24 * 60 * 60;
    const AUTO_RELEASE = 3 * 24 * 60 * 60;
    const DISPUTE_TIMEOUT = 30 * 24 * 60 * 60;

    beforeEach(async function () {
        [, buyer, seller, arbiter] = await hre.ethers.getSigners();

        const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
        usdc = await MockUSDC.deploy();
        await usdc.waitForDeployment();

        const Escrow = await hre.ethers.getContractFactory("Escrow");
        escrow = await Escrow.deploy();
        await escrow.waitForDeployment();

        await usdc.mint(buyer.address, 10000n * 10n ** 6n);
        await usdc.connect(buyer).approve(await escrow.getAddress(), 10000n * 10n ** 6n);
    });

    // ============================================
    // BASIC ESCROW
    // ============================================

    describe("Basic Escrow", function () {
        it("Should create and complete full lifecycle", async function () {
            const amount = 1000n * 10n ** 6n;
            const usdcAddr = await usdc.getAddress();

            await escrow.connect(buyer).createEscrow(
                seller.address, arbiter.address, amount, usdcAddr, "Test", ACC_PERIOD, DEL_PERIOD
            );
            await escrow.connect(seller).acceptDeal(0);
            await escrow.connect(buyer).release(0);

            const deal = await escrow.getEscrow(0);
            expect(deal.state).to.equal(3); // COMPLETE
        });
    });

    // ============================================
    // ARBITER FEE FIX
    // ============================================

    describe("Arbiter Incentives", function () {
        it("Should pay arbiter fee when buyer wins dispute", async function () {
            const amount = 1000n * 10n ** 6n;
            const usdcAddr = await usdc.getAddress();
            const expectedFee = amount / 1000n;

            await escrow.connect(buyer).createEscrow(
                seller.address, arbiter.address, amount, usdcAddr, "Test", ACC_PERIOD, DEL_PERIOD
            );
            await escrow.connect(seller).acceptDeal(0);
            await escrow.connect(buyer).raiseDispute(0);

            // Arbiter rules for buyer
            await escrow.connect(arbiter).resolveDispute(0, buyer.address);

            // Arbiter should have pending fees
            const pendingFees = await escrow.getPendingFees(arbiter.address, usdcAddr);
            expect(pendingFees).to.equal(expectedFee);
        });

        it("Should pay arbiter fee when seller wins dispute", async function () {
            const amount = 1000n * 10n ** 6n;
            const usdcAddr = await usdc.getAddress();
            const expectedFee = amount / 1000n;

            await escrow.connect(buyer).createEscrow(
                seller.address, arbiter.address, amount, usdcAddr, "Test", ACC_PERIOD, DEL_PERIOD
            );
            await escrow.connect(seller).acceptDeal(0);
            await escrow.connect(buyer).raiseDispute(0);

            // Arbiter rules for seller
            await escrow.connect(arbiter).resolveDispute(0, seller.address);

            const pendingFees = await escrow.getPendingFees(arbiter.address, usdcAddr);
            expect(pendingFees).to.equal(expectedFee);
        });

        it("Should allow arbiter to withdraw fees", async function () {
            const amount = 1000n * 10n ** 6n;
            const usdcAddr = await usdc.getAddress();
            const expectedFee = amount / 1000n;

            await escrow.connect(buyer).createEscrow(
                seller.address, arbiter.address, amount, usdcAddr, "Test", ACC_PERIOD, DEL_PERIOD
            );
            await escrow.connect(seller).acceptDeal(0);
            await escrow.connect(buyer).release(0);

            const arbiterBalBefore = await usdc.balanceOf(arbiter.address);
            await escrow.connect(arbiter).withdrawFees(usdcAddr);
            const arbiterBalAfter = await usdc.balanceOf(arbiter.address);

            expect(arbiterBalAfter - arbiterBalBefore).to.equal(expectedFee);
        });
    });

    // ============================================
    // DELIVERY DEADLINE (starts on accept)
    // ============================================

    describe("Delivery Deadline", function () {
        it("Should set delivery deadline when seller accepts", async function () {
            const amount = 100n * 10n ** 6n;
            const usdcAddr = await usdc.getAddress();

            await escrow.connect(buyer).createEscrow(
                seller.address, arbiter.address, amount, usdcAddr, "Test", ACC_PERIOD, DEL_PERIOD
            );

            // Before accept, deadline should be 0
            let deal = await escrow.getEscrow(0);
            expect(deal.deliveryDeadline).to.equal(0);

            // Accept sets the deadline
            await escrow.connect(seller).acceptDeal(0);
            deal = await escrow.getEscrow(0);
            expect(deal.deliveryDeadline).to.be.greaterThan(0);
        });
    });

    // ============================================
    // DISPUTE TIMEOUT
    // ============================================

    describe("Dispute Timeout", function () {
        it("Should allow buyer to claim after 30-day dispute timeout", async function () {
            const amount = 100n * 10n ** 6n;
            const usdcAddr = await usdc.getAddress();
            const buyerBalBefore = await usdc.balanceOf(buyer.address);

            await escrow.connect(buyer).createEscrow(
                seller.address, arbiter.address, amount, usdcAddr, "Test", ACC_PERIOD, DEL_PERIOD
            );
            await escrow.connect(seller).acceptDeal(0);
            await escrow.connect(buyer).raiseDispute(0);

            // Before 30 days
            expect(await escrow.canClaimDisputeTimeout(0)).to.be.false;
            await expect(escrow.connect(buyer).claimDisputeTimeout(0))
                .to.be.reverted;

            // After 30 days
            await time.increase(DISPUTE_TIMEOUT + 1);
            expect(await escrow.canClaimDisputeTimeout(0)).to.be.true;

            await escrow.connect(buyer).claimDisputeTimeout(0);
            expect(await usdc.balanceOf(buyer.address)).to.equal(buyerBalBefore);
        });
    });

    // ============================================
    // EDGE CASES
    // ============================================

    describe("Edge Cases", function () {
        it("Should reject zero address winner", async function () {
            const amount = 100n * 10n ** 6n;
            const usdcAddr = await usdc.getAddress();

            await escrow.connect(buyer).createEscrow(
                seller.address, arbiter.address, amount, usdcAddr, "Test", ACC_PERIOD, DEL_PERIOD
            );
            await escrow.connect(seller).acceptDeal(0);
            await escrow.connect(buyer).raiseDispute(0);

            await expect(
                escrow.connect(arbiter).resolveDispute(0, "0x0000000000000000000000000000000000000000")
            ).to.be.reverted;
        });

        it("Should reject amount below minimum", async function () {
            const usdcAddr = await usdc.getAddress();

            await expect(
                escrow.connect(buyer).createEscrow(
                    seller.address, arbiter.address, 100n, usdcAddr, "Too small", ACC_PERIOD, DEL_PERIOD
                )
            ).to.be.reverted;
        });
    });
});

// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Escrow - Production-Ready P2P Escrow
 * @author BaseTrust Team
 * @notice Gas-optimized, fee-on-transfer safe, pull-pattern arbiter fees.
 * @dev Implements a buyer-seller-arbiter escrow system with dispute resolution.
 */
contract Escrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============================================
    // ERRORS
    // ============================================

    error EthTransferFailed();
    error InvalidAddress();
    error AmountTooSmall();
    error SelfDeal();
    error NeutralArbiterRequired();
    error InvalidDeliveryPeriod();
    error EthAmountMismatch();
    error EthValueTooSmall();
    error EthNotAllowed();
    error OnlySeller();
    error OnlyBuyer();
    error OnlyArbiter();
    error OnlyParty();
    error InvalidState();
    error OfferExpired();
    error DeadlineNotPassed();
    error DeliveryRequired();
    error WindowActive();
    error DisputeRequired();
    error TimeoutNotReached();
    error InvalidWinner();
    error NoFees();

    // ============================================
    // CONSTANTS
    // ============================================
    
    /// @notice Minimum amount for an escrow (1e6 units)
    uint256 public constant MIN_ESCROW_AMOUNT = 1e6;
    
    /// @notice Time window after delivery before auto-release is available
    uint256 public constant AUTO_RELEASE_WINDOW = 14 days;
    
    /// @notice Time window for resolving a dispute before timeout claim
    uint256 public constant DISPUTE_TIMEOUT = 30 days;
    
    /// @notice Fee in basis points (0.1%)
    uint256 public constant FEE_BPS = 10; 

    // ============================================
    // STATE
    // ============================================

    enum State { AWAITING_ACCEPTANCE, AWAITING_DELIVERY, DELIVERED, COMPLETE, DISPUTED, REFUNDED }

    struct Deal {
        address buyer;
        address seller;
        address arbiter;
        address token;
        uint256 amount;
        State state;
        uint48 acceptanceDeadline;
        uint48 deliveryDeadline;
        uint48 deliveryTimestamp;
        uint48 disputeTimestamp;
        uint48 deliveryPeriod;
        string description;
        string proofOfDelivery;
    }

    /// @notice Total number of escrows created
    uint256 public nextEscrowId;
    
    /// @notice Mapping from escrow ID to Deal struct
    mapping(uint256 => Deal) public escrows;
    
    /// @notice Mapping tracking buyer cancel requests
    mapping(uint256 => bool) public buyerCancelRequest;
    
    /// @notice Mapping tracking seller cancel requests
    mapping(uint256 => bool) public sellerCancelRequest;
    
    /// @notice Pending fees for arbiters: arbiter => token => amount
    mapping(address => mapping(address => uint256)) public pendingFees; 

    // ============================================
    // EVENTS
    // ============================================

    event EscrowCreated(uint256 indexed escrowId, address indexed buyer, address indexed seller, uint256 amount);
    event DealAccepted(uint256 indexed escrowId, uint48 deliveryDeadline);
    event DeliveryConfirmed(uint256 indexed escrowId);
    event FundsReleased(uint256 indexed escrowId, uint256 payout);
    event Refunded(uint256 indexed escrowId, uint256 amount);
    event DisputeOpened(uint256 indexed escrowId);
    event DisputeResolved(uint256 indexed escrowId, address indexed winner);
    event MutualCancelRequested(uint256 indexed escrowId, address indexed by);
    event MutualCancelCompleted(uint256 indexed escrowId);
    event FeesWithdrawn(address indexed arbiter, address indexed token, uint256 amount);

    // ============================================
    // INTERNAL
    // ============================================

    /// @dev Internal transfer function handling ETH and ERC20s safely
    function _transfer(address tk, address to, uint256 amt) internal {
        if (amt == 0) revert AmountTooSmall();

        if (tk == address(0)) {
            (bool ok, ) = payable(to).call{value: amt}("");
            if (!ok) revert EthTransferFailed();
        } else {
            IERC20(tk).safeTransfer(to, amt);
        }
    }

    /// @dev Calculates and pays out funds with fee deduction
    function _payoutWithFee(uint256 id, Deal storage d, address recipient) internal {
        uint256 fee;
        fee = (d.amount * FEE_BPS) / 10000;
        uint256 payout = d.amount - fee;
        _transfer(d.token, recipient, payout);
        if (fee != 0) pendingFees[d.arbiter][d.token] += fee;
        emit FundsReleased(id, payout);
    }

    /// @dev Internal full refund logic
    function _fullRefund(uint256 id, Deal storage d) internal {
        d.state = State.REFUNDED;
        _transfer(d.token, d.buyer, d.amount);
        emit Refunded(id, d.amount);
    }

    // ============================================
    // CREATE
    // ============================================

    /**
     * @notice Creates a new escrow deal
     * @dev Fee-on-transfer safe; calculates actual received amount
     * @param seller Address of the seller
     * @param arbiter Address of the arbiter
     * @param amount Amount of tokens/ETH to escrow
     * @param token Token address (address(0) for ETH)
     * @param desc Description of the deal
     * @param accPeriod Time in seconds for seller to accept
     * @param delPeriod Time in seconds for delivery after acceptance
     */
    function createEscrow(
        address seller, 
        address arbiter, 
        uint256 amount, 
        address token,
        string calldata desc,
        uint256 accPeriod,
        uint256 delPeriod
    ) external payable nonReentrant {
        if (seller == address(0) || arbiter == address(0)) revert InvalidAddress();
        if (amount < MIN_ESCROW_AMOUNT) revert AmountTooSmall();
        if (seller == msg.sender) revert SelfDeal();
        if (arbiter == msg.sender || arbiter == seller) revert NeutralArbiterRequired();
        if (delPeriod == 0) revert InvalidDeliveryPeriod();
        
        uint256 received = amount;
        if (token == address(0)) {
            if (msg.value != amount) revert EthAmountMismatch();
            if (amount < 1e13) revert EthValueTooSmall(); // 0.00001 ETH
        } else {
            if (msg.value != 0) revert EthNotAllowed();
            address self = address(this); // Gas optimization: cache address(this)
            uint256 before = IERC20(token).balanceOf(self);
            IERC20(token).safeTransferFrom(msg.sender, self, amount);
            received = IERC20(token).balanceOf(self) - before;
            
            // Decimal-aware check for common stablecoins (USDC/USDT usually 6 decimals)
            if (received < MIN_ESCROW_AMOUNT) revert AmountTooSmall();
        }

        uint256 id = nextEscrowId++;
        Deal storage d = escrows[id];
        d.buyer = msg.sender;
        d.seller = seller;
        d.arbiter = arbiter;
        d.token = token;
        d.amount = received;
        d.state = State.AWAITING_ACCEPTANCE;
        d.acceptanceDeadline = uint48(block.timestamp + (accPeriod == 0 ? 30 days : accPeriod));
        d.deliveryPeriod = uint48(delPeriod);
        d.description = desc;

        emit EscrowCreated(id, msg.sender, seller, received);
    }

    // ============================================
    // SELLER
    // ============================================

    /// @notice Seller accepts the deal
    /// @dev Validates caller and state
    /// @param id Escrow ID
    function acceptDeal(uint256 id) external {
        Deal storage d = escrows[id];
        if (msg.sender != d.seller) revert OnlySeller();
        if (d.state != State.AWAITING_ACCEPTANCE) revert InvalidState();
        if (block.timestamp > d.acceptanceDeadline) revert OfferExpired();
        
        d.state = State.AWAITING_DELIVERY;
        d.deliveryDeadline = uint48(block.timestamp + d.deliveryPeriod);
        emit DealAccepted(id, d.deliveryDeadline);
    }

    /// @notice Seller marks the item as delivered
    /// @dev Sets delivery timestamp for auto-release window
    /// @param id Escrow ID
    /// @param proof Proof of delivery (URL, hash, etc.)
    function markDelivered(uint256 id, string calldata proof) external {
        Deal storage d = escrows[id];
        if (msg.sender != d.seller) revert OnlySeller();
        if (d.state != State.AWAITING_DELIVERY) revert InvalidState();
        
        d.state = State.DELIVERED;
        d.deliveryTimestamp = uint48(block.timestamp);
        d.proofOfDelivery = proof;
        emit DeliveryConfirmed(id);
    }

    /// @notice Seller rejects the deal, refunding the buyer
    /// @dev Can only be called before acceptance
    /// @param id Escrow ID
    function rejectDeal(uint256 id) external nonReentrant {
        Deal storage d = escrows[id];
        if (msg.sender != d.seller) revert OnlySeller();
        if (d.state != State.AWAITING_ACCEPTANCE) revert InvalidState();
        _fullRefund(id, d);
    }

    // ============================================
    // BUYER
    // ============================================

    /// @notice Buyer releases funds to seller
    /// @dev Explicit release before auto-release
    /// @param id Escrow ID
    function release(uint256 id) external nonReentrant {
        Deal storage d = escrows[id];
        if (msg.sender != d.buyer) revert OnlyBuyer();
        if (d.state != State.AWAITING_DELIVERY && d.state != State.DELIVERED) revert InvalidState();
        
        d.state = State.COMPLETE;
        _payoutWithFee(id, d, d.seller);
    }

    /// @notice Buyer claims refund if not accepted
    /// @dev Can be called anytime if seller hasn't accepted
    /// @param id Escrow ID
    function claimRefund(uint256 id) external nonReentrant {
        Deal storage d = escrows[id];
        if (msg.sender != d.buyer) revert OnlyBuyer();
        if (d.state != State.AWAITING_ACCEPTANCE) revert InvalidState();
        _fullRefund(id, d);
    }

    /// @notice Buyer claims refund if acceptance deadline passed
    /// @dev Redundant with claimRefund but explicit
    /// @param id Escrow ID
    function claimExpiredRefund(uint256 id) external nonReentrant {
        Deal storage d = escrows[id];
        if (msg.sender != d.buyer) revert OnlyBuyer();
        if (d.state != State.AWAITING_ACCEPTANCE) revert InvalidState();
        if (block.timestamp <= d.acceptanceDeadline) revert DeadlineNotPassed();
        _fullRefund(id, d);
    }

    /// @notice Buyer claims refund if delivery deadline passed
    /// @dev Seller failed to deliver in time
    /// @param id Escrow ID
    function claimDeliveryTimeout(uint256 id) external nonReentrant {
        Deal storage d = escrows[id];
        if (msg.sender != d.buyer) revert OnlyBuyer();
        if (d.state != State.AWAITING_DELIVERY) revert InvalidState();
        if (block.timestamp <= d.deliveryDeadline) revert DeadlineNotPassed();
        _fullRefund(id, d);
    }

    // ============================================
    // AUTO-RELEASE
    // ============================================

    /// @notice Anyone can trigger auto-release if delivery window passed
    /// @dev Protects seller from unresponsive buyer after delivery
    /// @param id Escrow ID
    function claimAutoRelease(uint256 id) external nonReentrant {
        Deal storage d = escrows[id];
        if (d.state != State.DELIVERED) revert DeliveryRequired();
        if (block.timestamp <= d.deliveryTimestamp + AUTO_RELEASE_WINDOW) revert WindowActive();
        
        d.state = State.COMPLETE;
        _payoutWithFee(id, d, d.seller);
    }

    // ============================================
    // DISPUTES
    // ============================================

    /// @notice Buyer or Seller raises a dispute
    /// @dev Moves state to DISPUTED
    /// @param id Escrow ID
    function raiseDispute(uint256 id) external {
        Deal storage d = escrows[id];
        if (msg.sender != d.buyer && msg.sender != d.seller) revert OnlyParty();
        if (d.state != State.AWAITING_DELIVERY && d.state != State.DELIVERED) revert InvalidState();
        
        d.state = State.DISPUTED;
        d.disputeTimestamp = uint48(block.timestamp);
        emit DisputeOpened(id);
    }

    /// @notice Arbiter resolves the dispute
    /// @dev Pays winner and collects fee
    /// @param id Escrow ID
    /// @param winner Address of the winner (buyer or seller)
    function resolveDispute(uint256 id, address winner) external nonReentrant {
        Deal storage d = escrows[id];
        if (msg.sender != d.arbiter) revert OnlyArbiter();
        if (d.state != State.DISPUTED) revert DisputeRequired();
        if (winner == address(0)) revert InvalidWinner();
        if (winner != d.buyer && winner != d.seller) revert InvalidWinner();

        uint256 fee = (d.amount * FEE_BPS) / 10000;
        uint256 payout = d.amount - fee;

        if (winner == d.seller) {
            d.state = State.COMPLETE;
            _transfer(d.token, d.seller, payout);
        } else {
            d.state = State.REFUNDED;
            _transfer(d.token, d.buyer, payout);
        }
        
        if (fee != 0) pendingFees[d.arbiter][d.token] += fee;
        emit DisputeResolved(id, winner);
    }

    /// @notice Buyer claims refund if dispute timeout passed
    /// @dev Anti-hostage mechanism if arbiter is unresponsive
    /// @param id Escrow ID
    function claimDisputeTimeout(uint256 id) external nonReentrant {
        Deal storage d = escrows[id];
        if (msg.sender != d.buyer) revert OnlyBuyer();
        if (d.state != State.DISPUTED) revert DisputeRequired();
        if (block.timestamp <= d.disputeTimestamp + DISPUTE_TIMEOUT) revert TimeoutNotReached();
        _fullRefund(id, d);
    }

    // ============================================
    // MUTUAL CANCEL
    // ============================================

    /// @notice Buyer or Seller requests mutual cancel
    /// @dev Both parties must request to trigger refund
    /// @param id Escrow ID
    function requestMutualCancel(uint256 id) external nonReentrant {
        Deal storage d = escrows[id];
        if (d.state != State.AWAITING_DELIVERY && d.state != State.DELIVERED) revert InvalidState();
        if (msg.sender != d.buyer && msg.sender != d.seller) revert OnlyParty();
        
        if (msg.sender == d.buyer) buyerCancelRequest[id] = true;
        else sellerCancelRequest[id] = true;
        
        emit MutualCancelRequested(id, msg.sender);
        
        if (buyerCancelRequest[id] && sellerCancelRequest[id]) {
            delete buyerCancelRequest[id]; // Gas optimization
            delete sellerCancelRequest[id]; // Gas optimization
            _fullRefund(id, d);
            emit MutualCancelCompleted(id);
        }
    }

    /// @notice Cancel a mutual cancel request
    /// @dev Resets the request flag
    /// @param id Escrow ID
    function cancelMutualCancelRequest(uint256 id) external {
        if (msg.sender == escrows[id].buyer) delete buyerCancelRequest[id];
        else if (msg.sender == escrows[id].seller) delete sellerCancelRequest[id];
    }

    // ============================================
    // ARBITER FEES (Pull Pattern)
    // ============================================

    /// @notice Arbiter withdraws accumulated fees
    /// @dev Pull pattern prevents reentrancy issues in main flow
    /// @param token Token address
    function withdrawFees(address token) external nonReentrant {
        uint256 amt = pendingFees[msg.sender][token];
        if (amt == 0) revert NoFees();
        pendingFees[msg.sender][token] = 0;
        _transfer(token, msg.sender, amt);
        emit FeesWithdrawn(msg.sender, token, amt);
    }

    // ============================================
    // VIEW
    // ============================================

    function getEscrow(uint256 id) external view returns (Deal memory) {
        return escrows[id];
    }

    function canClaimAutoRelease(uint256 id) external view returns (bool) {
        Deal storage d = escrows[id];
        return d.state == State.DELIVERED && block.timestamp > d.deliveryTimestamp + AUTO_RELEASE_WINDOW;
    }

    function canClaimDeliveryTimeout(uint256 id) external view returns (bool) {
        Deal storage d = escrows[id];
        return d.state == State.AWAITING_DELIVERY && block.timestamp > d.deliveryDeadline;
    }

    function canClaimDisputeTimeout(uint256 id) external view returns (bool) {
        Deal storage d = escrows[id];
        return d.state == State.DISPUTED && block.timestamp > d.disputeTimestamp + DISPUTE_TIMEOUT;
    }

    function getMutualCancelStatus(uint256 id) external view returns (bool, bool) {
        return (buyerCancelRequest[id], sellerCancelRequest[id]);
    }

    function getPendingFees(address arbiter, address token) external view returns (uint256) {
        return pendingFees[arbiter][token];
    }
}

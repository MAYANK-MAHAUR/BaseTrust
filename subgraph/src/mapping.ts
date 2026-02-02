import { BigInt, Bytes, Address } from "@graphprotocol/graph-ts"
import {
    EscrowCreated,
    DealAccepted,
    DeliveryConfirmed,
    FundsReleased,
    Refunded,
    DisputeOpened,
    DisputeResolved,
    MutualCancelCompleted,
    Escrow as EscrowContract
} from "../generated/Escrow/Escrow"
import { Escrow, EscrowEvent, GlobalStats } from "../generated/schema"

// Helper to get or create global stats
function getOrCreateGlobalStats(): GlobalStats {
    let stats = GlobalStats.load("global")
    if (!stats) {
        stats = new GlobalStats("global")
        stats.totalEscrows = BigInt.fromI32(0)
        stats.totalVolume = BigInt.fromI32(0)
        stats.totalCompleted = BigInt.fromI32(0)
        stats.totalDisputed = BigInt.fromI32(0)
    }
    return stats
}

// Helper to create an event log
function createEvent(
    escrowId: string,
    eventType: string,
    timestamp: BigInt,
    txHash: Bytes,
    logIndex: BigInt,
    data: string = ""
): void {
    let eventId = txHash.toHexString() + "-" + logIndex.toString()
    let event = new EscrowEvent(eventId)
    event.escrow = escrowId
    event.eventType = eventType
    event.timestamp = timestamp
    event.txHash = txHash
    event.data = data
    event.save()
}

// State enum values matching contract
const STATE_AWAITING_ACCEPTANCE = 0
const STATE_AWAITING_DELIVERY = 1
const STATE_DELIVERED = 2
const STATE_COMPLETE = 3
const STATE_DISPUTED = 4
const STATE_REFUNDED = 5

// New event: EscrowCreated(indexed uint256,indexed address,indexed address,uint256)
export function handleEscrowCreated(event: EscrowCreated): void {
    let escrowId = event.params.escrowId.toString()

    let escrow = new Escrow(escrowId)
    escrow.buyer = event.params.buyer
    escrow.seller = event.params.seller
    escrow.amount = event.params.amount
    escrow.state = STATE_AWAITING_ACCEPTANCE
    escrow.createdAt = event.block.timestamp
    escrow.createdTxHash = event.transaction.hash
    escrow.updatedAt = event.block.timestamp

    // Fetch token address from contract
    let contract = EscrowContract.bind(event.address)
    // Structure: buyer, seller, arbiter, token, amount...
    let deal = contract.try_escrows(event.params.escrowId)
    if (!deal.reverted) {
        escrow.arbiter = deal.value.value2
        escrow.token = deal.value.value3
        escrow.acceptanceDeadline = deal.value.value6
        escrow.description = deal.value.value11
    } else {
        // Fallback or potentially invalid
        escrow.arbiter = Address.fromString("0x0000000000000000000000000000000000000000")
        escrow.token = Address.fromString("0x0000000000000000000000000000000000000000") // Default to ETH if fail
    }

    escrow.save()

    // Update global stats
    let stats = getOrCreateGlobalStats()
    stats.totalEscrows = stats.totalEscrows.plus(BigInt.fromI32(1))
    stats.totalVolume = stats.totalVolume.plus(event.params.amount)
    stats.save()

    createEvent(
        escrowId,
        "Created",
        event.block.timestamp,
        event.transaction.hash,
        event.logIndex,
        '{"amount":"' + event.params.amount.toString() + '"}'
    )
}

// New event: DealAccepted(indexed uint256,uint48)
export function handleDealAccepted(event: DealAccepted): void {
    let escrowId = event.params.escrowId.toString()
    let escrow = Escrow.load(escrowId)

    if (escrow) {
        escrow.state = STATE_AWAITING_DELIVERY
        escrow.deliveryDeadline = event.params.deliveryDeadline
        escrow.updatedAt = event.block.timestamp
        escrow.save()
    }

    createEvent(
        escrowId,
        "Accepted",
        event.block.timestamp,
        event.transaction.hash,
        event.logIndex,
        '{"deadline":"' + event.params.deliveryDeadline.toString() + '"}'
    )
}

// New event: DeliveryConfirmed(indexed uint256) - no proof param in event
export function handleDeliveryConfirmed(event: DeliveryConfirmed): void {
    let escrowId = event.params.escrowId.toString()
    let escrow = Escrow.load(escrowId)

    if (escrow) {
        escrow.state = STATE_DELIVERED
        escrow.deliveryTimestamp = event.block.timestamp
        escrow.updatedAt = event.block.timestamp
        escrow.save()
    }

    createEvent(
        escrowId,
        "Delivered",
        event.block.timestamp,
        event.transaction.hash,
        event.logIndex
    )
}

export function handleFundsReleased(event: FundsReleased): void {
    let escrowId = event.params.escrowId.toString()
    let escrow = Escrow.load(escrowId)

    if (escrow) {
        escrow.state = STATE_COMPLETE
        escrow.updatedAt = event.block.timestamp
        escrow.save()
    }

    // Update global stats
    let stats = getOrCreateGlobalStats()
    stats.totalCompleted = stats.totalCompleted.plus(BigInt.fromI32(1))
    stats.save()

    createEvent(
        escrowId,
        "Released",
        event.block.timestamp,
        event.transaction.hash,
        event.logIndex,
        '{"payout":"' + event.params.payout.toString() + '"}'
    )
}

export function handleRefunded(event: Refunded): void {
    let escrowId = event.params.escrowId.toString()
    let escrow = Escrow.load(escrowId)

    if (escrow) {
        escrow.state = STATE_REFUNDED
        escrow.updatedAt = event.block.timestamp
        escrow.save()
    }

    createEvent(
        escrowId,
        "Refunded",
        event.block.timestamp,
        event.transaction.hash,
        event.logIndex,
        '{"amount":"' + event.params.amount.toString() + '"}'
    )
}

export function handleDisputeOpened(event: DisputeOpened): void {
    let escrowId = event.params.escrowId.toString()
    let escrow = Escrow.load(escrowId)

    if (escrow) {
        escrow.state = STATE_DISPUTED
        escrow.updatedAt = event.block.timestamp
        escrow.save()
    }

    // Update global stats
    let stats = getOrCreateGlobalStats()
    stats.totalDisputed = stats.totalDisputed.plus(BigInt.fromI32(1))
    stats.save()

    createEvent(
        escrowId,
        "DisputeOpened",
        event.block.timestamp,
        event.transaction.hash,
        event.logIndex
    )
}

// New event: DisputeResolved(indexed uint256,indexed address)
export function handleDisputeResolved(event: DisputeResolved): void {
    let escrowId = event.params.escrowId.toString()
    let escrow = Escrow.load(escrowId)

    if (escrow) {
        // Winner determines final state
        if (event.params.winner == escrow.seller) {
            escrow.state = STATE_COMPLETE
            let stats = getOrCreateGlobalStats()
            stats.totalCompleted = stats.totalCompleted.plus(BigInt.fromI32(1))
            stats.save()
        } else {
            escrow.state = STATE_REFUNDED
        }
        escrow.updatedAt = event.block.timestamp
        escrow.save()
    }

    createEvent(
        escrowId,
        "DisputeResolved",
        event.block.timestamp,
        event.transaction.hash,
        event.logIndex,
        '{"winner":"' + event.params.winner.toHexString() + '"}'
    )
}

export function handleMutualCancelCompleted(event: MutualCancelCompleted): void {
    let escrowId = event.params.escrowId.toString()
    let escrow = Escrow.load(escrowId)

    if (escrow) {
        escrow.state = STATE_REFUNDED
        escrow.updatedAt = event.block.timestamp
        escrow.save()
    }

    createEvent(
        escrowId,
        "MutualCancel",
        event.block.timestamp,
        event.transaction.hash,
        event.logIndex
    )
}

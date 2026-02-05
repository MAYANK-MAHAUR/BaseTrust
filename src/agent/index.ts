import { Plugin } from "@elizaos/core";
import {
    createEscrowAction,
    acceptDealAction,
    markDeliveredAction,
    releaseFundsAction,
    raiseDisputeAction,
    resolveDisputeAction,
    claimRefundAction,
    claimAutoReleaseAction,
    getEscrowAction
} from "./actions";

export const baseTrustPlugin: Plugin = {
    name: "basetrust-escrow",
    description: "Plugin for interacting with BaseTrust Escrow contract on Base.",
    actions: [
        createEscrowAction,
        acceptDealAction,
        markDeliveredAction,
        releaseFundsAction,
        raiseDisputeAction,
        resolveDisputeAction,
        claimRefundAction,
        claimAutoReleaseAction,
        getEscrowAction
    ],
    evaluators: [],
    providers: [],
};

export default baseTrustPlugin;


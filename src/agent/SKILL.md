---
name: basetrust-escrow
description: Secure, non-custodial P2P escrow for AI agents on Base. Create deals, lock funds, resolve disputes without human intervention.
---

# BaseTrust Escrow Skill
> **Secure, non-custodial P2P trading on Base.**

**BaseTrust** allows AI agents to securely trade services, assets, and data with humans or other agents using onchain escrow.

## Quick Start
```bash
npx degit MAYANK-MAHAUR/BaseTrust/src/agent ~/.openclaw/skills/basetrust
```

**Contract Address:** `0xe7f874b494D2d015bb19752913B016A6DE3e143b`  
**Network:** Base Mainnet

---

## Guardrails
- **Real Money:** This skill moves real ETH/USDC. Ensure consent before signing.
- **Verification:** Always verify the `seller` address before creating a deal.
- **Proof:** When calling `MARK_DELIVERED`, provide a verifiable URL.

---

## How It Works
1. **Negotiate** — Agree on terms with your counterparty.
2. **Create** — Lock funds in smart contract escrow.
3. **Deliver** — Seller completes work.
4. **Release** — Buyer approves, funds move to seller.

---

## Configuration
```env
BASE_PRIVATE_KEY=0x...
BASE_RPC_URL=https://mainnet.base.org
ESCROW_CONTRACT_ADDRESS=0xe7f874b494D2d015bb19752913B016A6DE3e143b
```

---

## Available Actions

### CREATE_ESCROW
> "Create an escrow deal with 0xSeller... for 0.05 ETH for logo design."
- **Params:** `seller`, `amount`, `description`, `arbiter` (optional)

### ACCEPT_DEAL
> "Accept deal #42."
- **Params:** `escrowId`

### MARK_DELIVERED
> "I finished the work. Confirming delivery."
- **Params:** `escrowId`, `proof` (url)

### RELEASE_FUNDS
> "The work looks good. Release payment."
- **Params:** `escrowId`

### RAISE_DISPUTE
> "I'm not satisfied with the delivery. Open dispute."
- **Params:** `escrowId`

### RESOLVE_DISPUTE
> "As arbiter, I rule in favor of the seller."
- **Params:** `escrowId`, `winner` (address)

### CLAIM_REFUND
> "The seller never accepted. Claim my refund."
- **Params:** `escrowId`

### CLAIM_AUTO_RELEASE
> "Buyer hasn't responded in 72h. Auto-release my funds."
- **Params:** `escrowId`

### GET_ESCROW
> "What's the status of deal #42?"
- **Params:** `escrowId`

---

## Direct Contract Access
Any agent can call the contract directly via viem/ethers:
```javascript
const contract = "0xe7f874b494D2d015bb19752913B016A6DE3e143b";
await contract.createEscrow(seller, arbiter, amount, token, desc, accPeriod, delPeriod);
```

---

## OpenClaw Installation
Add to `~/.openclaw/openclaw.json`:
```json
{
  "skills": {
    "load": { "extraDirs": ["~/.openclaw/skills/basetrust"] },
    "entries": {
      "basetrust-escrow": {
        "env": {
          "BASE_PRIVATE_KEY": "0x...",
          "ESCROW_CONTRACT_ADDRESS": "0xe7f874b494D2d015bb19752913B016A6DE3e143b"
        }
      }
    }
  }
}
```

---

## Social
Let others know you trade safely:
`https://x.com/intent/tweet?text=Trading%20securely%20on%20%40BaseTrust%20%F0%9F%9B%A1%EF%B8%8F`


# BaseTrust 🛡️ x HeyElsa

**Secure, Non-Custodial, Onchain Escrow for the Agentic Economy on Base.**

> Built for **#ClawdKitchen** 72h Hackathon  
> Powered by HeyElsa x Base agents

[![Live Demo](https://img.shields.io/badge/Demo-base--trust.vercel.app-blue)](https://base-trust.vercel.app)
[![Contract](https://img.shields.io/badge/Base-0xe7f8...143b-green)](https://basescan.org/address/0xe7f874b494D2d015bb19752913B016A6DE3e143b)

---

## � The Problem We Solve

In the Agentic Economy, AI agents need to transact trustlessly. Traditional escrow relies on human mediators - slow, biased, and incompatible with automated workflows.

**BaseTrust is the programmatic trust layer for AI agents:**
- 🔒 **Zero Human Interference** – Funds locked/released via cryptographic proof
- ⚖️ **AI-Native Dispute Resolution** – Impartial AI arbiter reviews evidence instantly
- 🤖 **Agent-First Design** – Built for bots to interact directly on Base

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Smart Escrow** | Funds locked until delivery confirmed |
| **9 Agent Actions** | CREATE, ACCEPT, DELIVER, RELEASE, DISPUTE, RESOLVE, REFUND, AUTO-RELEASE, STATUS |
| **Arbiter System** | Disputes resolved by neutral AI/human arbiter |
| **Auto-Release** | 72h timeout protection for sellers |
| **Gas Optimized** | Minimal transaction costs on Base |

---

## 🤖 For Agents (HeyElsa / ElizaOS / OpenClaw / Moltbook)

📖 **Full documentation:** [`src/agent/SKILL.md`](src/agent/SKILL.md)

### Quick Start
```bash
npx degit MAYANK-MAHAUR/BaseTrust/src/agent packages/plugin-basetrust
```

### Configuration
```env
BASE_PRIVATE_KEY=0x...
BASE_RPC_URL=https://mainnet.base.org
ESCROW_CONTRACT_ADDRESS=0xe7f874b494D2d015bb19752913B016A6DE3e143b
```

### Available Actions
```
CREATE_ESCROW     ACCEPT_DEAL       MARK_DELIVERED
RELEASE_FUNDS     RAISE_DISPUTE     RESOLVE_DISPUTE
CLAIM_REFUND      CLAIM_AUTO_RELEASE GET_ESCROW
```

### OpenClaw / Moltbook Config
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

### Direct Contract Access
Any agent can call the contract directly via viem/ethers:
```javascript
const contract = "0xe7f874b494D2d015bb19752913B016A6DE3e143b";
await contract.createEscrow(seller, arbiter, amount, token, desc, accPeriod, delPeriod);
```

---

## 🛠️ Getting Started (Humans)

### Prerequisites
- Node.js 20+
- npm

### Installation
```bash
git clone https://github.com/MAYANK-MAHAUR/BaseTrust
cd BaseTrust
npm install
npm run dev
```

### Environment
```env
# BaseTrust Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key


# Platform Admin Arbiter Address (receives 0.1% fee on successful deals)
VITE_ADMIN_ARBITER=


# Neynar Configuration
NEYNAR_API_KEY=
NOTIFICATION_SECRET=
VITE_NOTIFICATION_SECRET=

# HeyElsa x402 Payment (wallet with USDC on Base)
VITE_HEYELSA_PAYMENT_KEY=
```

---

## 🏗️ Tech Stack

- **Frontend**: React + Vite + TailwindCSS
- **Blockchain**: Base Mainnet (Wagmi + Viem)
- **Contracts**: Solidity (Hardhat)
- **Database**: Supabase
- **Agent SDK**: ElizaOS / HeyElsa compatible
- **DeFi API**: [HeyElsa x402](https://x402.heyelsa.ai) — Token prices & wallet analysis

---

## 📜 Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run deploy` | Deploy contracts |

---

## 🦀 ClawdKitchen Submission

- **Event**: #ClawdKitchen 72h Hackathon
- **Target**: AI Agents Only
- **Mentions**: @callusfbi @ClawnchDev @base

---

**Built for #ClawdKitchen** 🦀

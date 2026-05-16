# Presnce — AI-Verified On-Chain Event Attendance

> Prove you were there.

Presnce is a decentralized event platform where attendance is verified by AI — not QR codes, not check-in apps, not centralized databases. Every certificate is permanent, tamper-proof, and on-chain.

---

## How It Works

**For organizers:**
1. Create an event on Presnce with name, location, date, time, and cover image
2. Share the event ID with attendees: *"Claim at presnce.xyz/claim — Event ID: #0001"*

**For attendees:**
1. Attend the event, then create public proof — tweet mentioning the event, upload a photo, or paste your RSVP link
2. Go to `/claim`, enter the event ID and paste your proof URL
3. Pay 0.005 GEN — AI validators fetch your URL and judge your proof (30–90 seconds)
4. **Valid** → mint your free on-chain attendance certificate → share to X

---

## Features

- AI attendance verification via GenLayer Intelligent Contracts
- Cover image upload to IPFS via Pinata
- Google Maps embed from location text
- Shareable certificate: download PNG (1200×630) + Share to X
- Per-event attendance gallery with verdict and confidence score
- Nickname system — set your display name, shows everywhere
- Responsive on mobile and desktop

---

## Fee Structure

| Action | Fee |
|--------|-----|
| Create event | 0.01 GEN |
| Claim attendance | 0.005 GEN |
| Mint certificate | Free |

---

## Setup

### 1. Deploy Contract

```bash
genlayer deploy --contract contracts/presnce.py
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
```

Fill in `.env`:

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_GENLAYER_CHAIN=studionet
NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api
NEXT_PUBLIC_NETWORK=studionet
NEXT_PUBLIC_PINATA_JWT=your_pinata_jwt
```

```bash
npm run dev
```

### 3. Get GEN tokens

Get free GEN at [studio.genlayer.com](https://studio.genlayer.com) → faucet.

---

## Tech Stack

- **Contract** — Python on GenLayer (`gl.nondet.web.get`, `gl.vm.run_nondet_unsafe`)
- **Frontend** — Next.js 14 + TypeScript
- **Wallet** — MetaMask via `genlayer-js`
- **Storage** — IPFS via Pinata
- **Maps** — Google Maps Embed (no API key)

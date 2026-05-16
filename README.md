# Presnce — AI-Verified On-Chain Event Attendance

> Prove you were there.

Presnce is a decentralized event platform where attendance is verified by AI — not QR codes, not check-in apps, not centralized databases. Every certificate is permanent, tamper-proof, and on-chain.

Built on **GenLayer Intelligent Contracts** — smart contracts that can read the internet and use AI to make decisions.

---

## The Problem

Most event check-ins are easy to fake:

- **POAP** — anyone can claim without showing up
- **QR codes** — get shared in group chats before the event ends
- **Manual lists** — depend on the organizer being honest
- **EventBrite** — centralized database, single point of failure

None of them actually prove you were there.

---

## The Solution

Presnce uses AI to verify attendance from real-world proof. You submit a public URL — a tweet you posted at the event, a photo you uploaded, or your RSVP confirmation. The Intelligent Contract fetches that URL directly from the internet and 5 AI validators independently judge whether your proof is real.

No trust required. No organizer approval. Just proof.

---

## How It Works

### For Organizers
1. Go to `/create-event` — fill in name, location, date, time, and upload a cover image
2. Pay **0.01 GEN** — event is created on-chain with a unique event ID
3. Share the ID with attendees: *"Claim your attendance at presnce.vercel.app/claim — Event ID: #0001"*

### For Attendees
1. Attend the event, then create public proof:
   - Tweet: *"Just attended [Event Name] in [Location]!"*
   - Upload a photo from the venue
   - Paste your RSVP confirmation link
2. Go to `/claim` — enter the event ID and paste your proof URL
3. Pay **0.005 GEN** — AI validators fetch your URL and judge your proof (30–90 seconds)
4. **Valid** → mint your free on-chain attendance certificate
5. Share your certificate as a PNG to X or download it

### Verdict System

| Verdict | Meaning |
|---------|---------|
| `valid` | Proof confirms attendance — certificate mintable |
| `insufficient` | Content is ambiguous or only partially related |
| `invalid` | Proof is unrelated, unreachable, or fake |

The verdict and confidence score (0–100%) are stored permanently on-chain.

---

## Features

- 🤖 **AI attendance verification** — 5 validators fetch and judge your proof URL
- 🗺️ **Google Maps embed** — location shown on map in event detail page
- 🖼️ **Cover image upload** — stored permanently on IPFS via Pinata
- 📜 **On-chain certificate NFT** — minted to your wallet, permanent
- 📤 **Share to X** — auto-generate 1200×630 PNG + twitter intent
- 🏛️ **Per-event gallery** — all attendance claims with verdict and confidence
- 👤 **On-chain nickname** — set once, shows everywhere for everyone
- 📱 **Mobile responsive** — works on all screen sizes
- ⏰ **Date & time** — events support optional time field

---

## Fee Structure

| Action | Fee | Notes |
|--------|-----|-------|
| Create event | 0.01 GEN | One-time per event |
| Claim attendance | 0.005 GEN | Non-refundable, anti-spam |
| Mint certificate | Free | Only if verdict is valid |
| Set nickname | Free | Stored on-chain |

---

## Contract Methods

### Write
| Method | Fee | Description |
|--------|-----|-------------|
| `create_event(name, description, location, event_date, event_time, image_url, max_attendees)` | 0.01 GEN | Create event on-chain |
| `claim_attendance(event_id, proof_url)` | 0.005 GEN | Submit proof — AI verified |
| `mint_certificate(attendance_id)` | Free | Mint NFT certificate |
| `set_nickname(name)` | Free | Set on-chain display name |
| `close_event(event_id)` | Free | Close event (organizer only) |
| `revoke_attendance(attendance_id)` | Free | Revoke attendance (organizer only) |

### Read
| Method | Description |
|--------|-------------|
| `get_event(event_id)` | Event details |
| `get_all_events()` | All events |
| `get_attendance(attendance_id)` | Attendance record with verdict |
| `get_event_attendances(event_id)` | All claims for an event |
| `get_attendee_history(addr)` | All claims by an address |
| `get_certificate(token_id)` | Certificate NFT data |
| `get_player_certificates(addr)` | All certificates by an address |
| `get_nickname(addr)` | On-chain display name |
| `get_stats()` | Platform statistics |

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Intelligent Contract | Python on GenLayer |
| AI Verification | `gl.vm.run_nondet_unsafe` + `gl.nondet.web.get()` |
| Frontend | Next.js 14 + TypeScript |
| Wallet | MetaMask via `genlayer-js` |
| Image Storage | IPFS via Pinata |
| Maps | Google Maps Embed (no API key needed) |
| Certificate | Canvas API — 1200×630 PNG |

---

## Setup

### 1. Deploy Contract

```bash
genlayer deploy --contract contracts/presnce.py
```

Copy the deployed contract address.

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
NEXT_PUBLIC_PINATA_JWT=your_pinata_jwt_here
```

```bash
npm run dev
```

Open `http://localhost:3000`

### 3. Get GEN tokens

Get free GEN at [studio.genlayer.com](https://studio.genlayer.com) → connect wallet → faucet.

---

## Quick Demo (5 minutes)

1. Connect MetaMask → switch to GenLayer Studionet
2. Go to **Host** → upload cover image, fill in event details → pay 0.01 GEN
3. Tweet something mentioning your event name and location
4. Go to **Claim** → paste event ID + tweet URL → pay 0.005 GEN
5. Wait 30–90 seconds → AI verdict appears on-chain
6. **Valid** → go to **Dashboard** → Mint certificate
7. Go to certificate page → **Share to X** → PNG auto-downloads, tweet opens

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page with live stats |
| `/events` | Explore all events |
| `/create-event` | Host a new event |
| `/claim` | Submit attendance proof |
| `/event/[id]` | Event detail + Google Maps + attendance gallery |
| `/certificate/[id]` | Shareable certificate + Share to X |
| `/dashboard` | Personal stats, events, claims, certificates, nickname |
| `/organizer/[addr]` | Organizer profile and events |

---

## License

MIT — Built by [@HabiiytH](https://x.com/HabiiytH)
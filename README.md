# Presnce — AI-Verified On-Chain Event Attendance

Your presence, on-chain.

Presnce is a decentralized event platform where attendance is verified by **GenLayer Intelligent Contracts** — not QR codes, not check-in apps, not centralized databases.

---

## How It Works

1. **Organizer creates an event** — pays 0.01 GEN, gets an `event_id`
2. **Attendee submits proof** — a public URL (tweet, ticket, RSVP) as evidence they attended
3. **Intelligent Contract fetches the URL** — using `gl.nondet.web.get()`
4. **AI validators judge** — did this person really attend? Verdict: `valid` / `invalid` / `insufficient`
5. **Certificate minted** — valid attendees mint an on-chain attendance NFT with AI confidence score

---

## What Makes Presnce Unique

Unlike POAP (honor system, anyone can claim) or EventBrite (centralized), Presnce uses **GenLayer Intelligent Contracts** to:

1. Fetch and read proof URLs directly from the internet
2. Judge attendance evidence using AI consensus
3. Issue tamper-proof on-chain certificates
4. Verify organizer identity from their profile URL

This is only possible on GenLayer — regular smart contracts cannot read the internet.

---

## Live Demo & Resources

| Resource | Link |
|----------|------|
| Live Demo | [presnce.vercel.app](https://presnce.vercel.app) |
| Contract | `0x...` (Studionet) |
| Explorer | [explorer-studio.genlayer.com](https://explorer-studio.genlayer.com) |

---

## Quick Demo (3 minutes)

1. **Connect** MetaMask to GenLayer Studionet
2. **Create event** → Fill example → Submit → Get `event_id`
3. **Browse events** at `/events` → see all on-chain events
4. **Claim attendance** → Submit event_id + proof URL → AI judges in 30-90s
5. **Mint certificate** → If verdict is `valid`, mint your on-chain attendance NFT

---

## Fee Structure

| Action | Fee |
|--------|-----|
| Create event | 0.01 GEN |
| Claim attendance | 0.005 GEN |
| Apply verified organizer | 0.02 GEN |
| Mint certificate | Free (gas only) |
| Platform fee | 5% |

---

## AI Verdict System

**Attendance claim:**
- `valid` — proof clearly confirms attendance
- `insufficient` — page loads but evidence is ambiguous
- `invalid` — proof unrelated or URL unreachable

**Organizer verification:**
- `approved` — real person/org with credible online presence
- `rejected` — no verifiable identity found

---

## Contract Methods

### Write
| Method | Description |
|--------|-------------|
| `create_event(...)` | Create an on-chain event |
| `claim_attendance(event_id, proof_url)` | Submit attendance proof (AI verified) |
| `apply_verified_organizer(profile_url)` | Apply for verified badge (AI verified) |
| `mint_certificate(attendance_id)` | Mint attendance NFT |
| `close_event(event_id)` | Close event (organizer only) |
| `revoke_attendance(attendance_id)` | Revoke suspicious attendance |
| `withdraw_fees()` | Owner withdraws platform fees |

### Read
| Method | Description |
|--------|-------------|
| `get_event(event_id)` | Get event details |
| `get_all_events()` | List all events |
| `get_organizer_events(addr)` | Get events by organizer |
| `get_attendance(attendance_id)` | Get attendance record |
| `get_event_attendances(event_id)` | Get all attendances for an event |
| `get_attendee_history(addr)` | Get all claims by attendee |
| `get_certificate(token_id)` | Get certificate NFT |
| `get_player_certificates(addr)` | Get all certificates by address |
| `get_organizer(addr)` | Get organizer profile |
| `get_stats()` | Platform statistics |

---

## Setup

### 1. Deploy Contract

```bash
genlayer network set studionet
genvm-lint check contracts/presnce.py
genlayer deploy --contract contracts/presnce.py
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
```

Edit `.env`:

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

Open `http://localhost:3000`

---

## Tech Stack

- **Intelligent Contract**: Python on GenLayer (`gl.nondet.web.get`, `gl.eq_principle.prompt_comparative`, `gl.vm.run_nondet_unsafe`)
- **Frontend**: Next.js 14 + TypeScript
- **Wallet**: MetaMask via `genlayer-js` SDK
- **NFT Storage**: On-chain via `TreeMap`

---

## License

MIT

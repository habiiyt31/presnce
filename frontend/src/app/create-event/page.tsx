"use client";
import { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { TxStatus } from "@/components/TxStatus";
import { useWallet } from "@/hooks/useWallet";
import { toWei, getReadClient, CONTRACT_ADDRESS } from "@/lib/genlayer";
import type { EventRecord } from "@/types";

const CREATE_FEE = "0.01";

const EXAMPLES = [
  {
    name: "GenLayer Builder Meetup — Jakarta",
    description: "Monthly gathering for GenLayer builders and developers in Jakarta. We discuss Intelligent Contracts, share projects, and network. Food and drinks provided.",
    location: "Jakarta, Indonesia",
    event_date: "2026-06-15",
    max_attendees: 50,
  },
  {
    name: "Web3 UX Workshop — Online",
    description: "A hands-on workshop covering UX principles for decentralized applications. We'll review real dApps and critique their onboarding flows, wallet integrations, and error states.",
    location: "Online (Zoom)",
    event_date: "2026-06-20",
    max_attendees: 100,
  },
  {
    name: "DeFi Founders Dinner — Singapore",
    description: "Invite-only dinner for DeFi founders and investors in Singapore. Hosted by the Asia Web3 Alliance. Attendance verified on-chain via Presnce.",
    location: "Singapore",
    event_date: "2026-07-01",
    max_attendees: 30,
  },
];

type TxState = { status: "idle"|"pending"|"success"|"error"; hash?: string; message?: string; };

async function findNewlyCreatedEvent(
  address: string,
  knownIds: Set<number>,
  timeoutMs = 30_000
): Promise<EventRecord | null> {
  const client = getReadClient();
  const start  = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const ids = await client.readContract({
        address:      CONTRACT_ADDRESS as `0x${string}`,
        functionName: "get_organizer_events",
        args:         [address] as any,
      }) as Array<number | bigint | string>;

      const newIds = (ids || []).map(Number).filter(id => !knownIds.has(id));
      if (newIds.length > 0) {
        const newest = Math.max(...newIds);
        const ev = await client.readContract({
          address:      CONTRACT_ADDRESS as `0x${string}`,
          functionName: "get_event",
          args:         [newest] as any,
        }) as any;
        if (ev && ev.event_id !== undefined) return ev as EventRecord;
      }
    } catch {}
    await new Promise(r => setTimeout(r, 2500));
  }
  return null;
}

export default function CreateEventPage() {
  const { address, isConnected, connect, writeContract } = useWallet();
  const [form, setForm] = useState({
    name: "", description: "", location: "", event_date: "", max_attendees: "50",
  });
  const [tx, setTx]             = useState<TxState>({ status: "idle" });
  const [created, setCreated]   = useState<EventRecord | null>(null);
  const [resolving, setResolving] = useState(false);
  const [exampleIdx, setExI]    = useState(0);

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const valid = form.name.trim().length >= 3 &&
    form.description.trim().length >= 20 &&
    form.location.trim().length >= 2 &&
    form.event_date.trim().length >= 8 &&
    Number(form.max_attendees) > 0;

  function fillExample() {
    const ex = EXAMPLES[exampleIdx % EXAMPLES.length];
    setForm({ name: ex.name, description: ex.description, location: ex.location, event_date: ex.event_date, max_attendees: String(ex.max_attendees) });
    setExI(i => i + 1);
  }

  function resetForm() {
    setForm({ name: "", description: "", location: "", event_date: "", max_attendees: "50" });
    setTx({ status: "idle" });
    setCreated(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isConnected || !address) { connect(); return; }
    if (!valid) return;

    let knownIds = new Set<number>();
    try {
      const client = getReadClient();
      const ids = await client.readContract({
        address:      CONTRACT_ADDRESS as `0x${string}`,
        functionName: "get_organizer_events",
        args:         [address] as any,
      }) as Array<number | bigint | string>;
      knownIds = new Set((ids || []).map(Number));
    } catch {}

    setTx({ status: "pending", message: "Creating event on-chain..." });
    try {
      const { txHash, timedOut } = await writeContract(
        "create_event",
        [form.name, form.description, form.location, form.event_date, Number(form.max_attendees)],
        toWei(CREATE_FEE)
      );
      setTx({
        status: timedOut ? "pending" : "success",
        hash: txHash,
        message: timedOut ? "Submitted. Confirming..." : "Event created! Resolving event ID...",
      });
      setResolving(true);
      const ev = await findNewlyCreatedEvent(address, knownIds);
      setResolving(false);
      if (ev) {
        setCreated(ev);
        setTx(p => ({ ...p, status: "success", message: "Event created on-chain!" }));
      } else {
        setTx(p => ({ ...p, status: "success", message: "Submitted. Check My Events in a moment." }));
      }
    } catch (err: any) {
      setResolving(false);
      setTx({ status: "error", message: err?.message || "Transaction failed" });
    }
  }

  // Success card
  if (created) {
    return (
      <div className="min-h-dvh flex flex-col">
        <Navbar />
        <main className="flex-1 px-4 sm:px-6 py-10 max-w-2xl mx-auto w-full">
          <div className="animate-fade-up">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-sage-light animate-pulse" />
              <p className="section-label">Event created on-chain</p>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink-50 mb-2">
              Your event is live.
            </h1>
            <p className="text-sm text-ink-300 mb-8">
              Share the link so attendees can claim their attendance.
            </p>

            <div className="relative border border-violet/30 bg-gradient-to-br from-ink-800 to-ink-900 rounded-sm p-6 sm:p-8 mb-6 overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10 pointer-events-none"
                style={{ background: "radial-gradient(circle, #7C5CBF 0%, transparent 70%)" }} />

              <div className="flex items-start justify-between mb-6 gap-4">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-violet/60 mb-1">Event ID</p>
                  <p className="font-display text-5xl sm:text-6xl font-bold text-violet-light leading-none">
                    #{String(created.event_id).padStart(4, "0")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-ink-500 mb-1">Max Attendees</p>
                  <p className="font-display text-5xl sm:text-6xl font-bold text-ink-100 leading-none">
                    {created.max_attendees}
                  </p>
                </div>
              </div>

              <div className="divider mb-5" />

              <h3 className="font-display text-lg font-semibold text-ink-100 mb-1">{created.name}</h3>
              <p className="text-xs text-ink-300 line-clamp-2 mb-5 leading-relaxed">{created.description}</p>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-ink-500 mb-1">Location</p>
                  <p className="text-ink-200">{created.location}</p>
                </div>
                <div>
                  <p className="text-ink-500 mb-1">Date</p>
                  <p className="font-mono text-ink-200">{created.event_date}</p>
                </div>
                <div>
                  <p className="text-ink-500 mb-1">Status</p>
                  <p className="font-mono text-sage-light">active</p>
                </div>
                <div>
                  <p className="text-ink-500 mb-1">Verified</p>
                  <p className="font-mono text-ink-400">not yet</p>
                </div>
              </div>
            </div>

            {tx.hash && (
              <a href={`https://explorer-studio.genlayer.com/tx/${tx.hash}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 mb-6 p-3 border border-ink-700 rounded-sm hover:border-violet/40 transition-colors group">
                <div className="min-w-0">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-ink-500 mb-0.5">Transaction</p>
                  <p className="font-mono text-xs text-ink-200 truncate">{tx.hash}</p>
                </div>
                <svg className="w-4 h-4 text-ink-400 group-hover:text-violet-light shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}

            <div className="grid sm:grid-cols-2 gap-3">
              <Link href="/my-events" className="btn-primary text-center">View in My Events</Link>
              <button onClick={resetForm} className="btn-secondary">Create another</button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const pending = tx.status === "pending" || resolving;

  return (
    <div className="min-h-dvh flex flex-col">
      <Navbar />
      <main className="flex-1 px-4 sm:px-6 py-10 max-w-2xl mx-auto w-full">
        <div className="mb-8 animate-fade-up">
          <p className="section-label mb-3">Host an event</p>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink-50 mb-2">Create event</h1>
              <p className="text-sm text-ink-300">On-chain. AI-verified attendance. Fee: <span className="font-mono text-violet-light">{CREATE_FEE} GEN</span></p>
            </div>
            <button type="button" onClick={fillExample}
              className="shrink-0 flex items-center gap-1.5 border border-violet/40 text-violet-light hover:bg-violet/10 px-3 py-2 rounded-sm text-xs font-mono transition-colors mt-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Fill example
            </button>
          </div>
        </div>

        {pending && (
          <div className="mb-6 border border-violet/30 bg-violet/5 rounded-sm p-5 animate-fade-up">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 rounded-full bg-violet-light animate-pulse" />
              <p className="text-sm font-medium text-violet-light">
                {resolving ? "Resolving event ID..." : "Creating event on-chain..."}
              </p>
            </div>
            <p className="text-xs text-ink-400">This usually takes a few seconds.</p>
          </div>
        )}

        <form onSubmit={submit} className={`space-y-5 animate-fade-up delay-100 ${pending ? "opacity-50 pointer-events-none" : ""}`}>
          <div>
            <label className="block text-xs font-mono text-ink-400 mb-2 uppercase tracking-wider">Event name *</label>
            <input type="text" className="input-field" placeholder="GenLayer Builder Meetup"
              value={form.name} onChange={e => set("name", e.target.value)} minLength={3} required />
          </div>

          <div>
            <label className="block text-xs font-mono text-ink-400 mb-2 uppercase tracking-wider">
              Description * <span className="normal-case text-ink-500">(min 20 chars)</span>
            </label>
            <textarea className="input-field min-h-[100px]"
              placeholder="What is this event about? Who should attend? What will happen?"
              value={form.description} onChange={e => set("description", e.target.value)} minLength={20} required />
            <p className="mt-1 text-xs text-ink-500 text-right">{form.description.length} chars</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-ink-400 mb-2 uppercase tracking-wider">Location *</label>
              <input type="text" className="input-field" placeholder="Jakarta, Indonesia"
                value={form.location} onChange={e => set("location", e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-mono text-ink-400 mb-2 uppercase tracking-wider">Event date *</label>
              <input type="date" className="input-field"
                value={form.event_date} onChange={e => set("event_date", e.target.value)} required />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-ink-400 mb-2 uppercase tracking-wider">Max attendees *</label>
            <input type="number" min="1" max="10000" className="input-field"
              value={form.max_attendees} onChange={e => set("max_attendees", e.target.value)} required />
            <p className="mt-1 text-xs text-ink-500">Attendance claims are capped at this number.</p>
          </div>

          <div className="card p-4 flex items-start gap-3">
            <div className="w-1 h-1 rounded-full bg-violet mt-2 shrink-0 animate-pulse" />
            <p className="text-xs text-ink-300 leading-relaxed">
              Fee: <span className="font-mono text-violet-light">{CREATE_FEE} GEN</span>. After creation,
              attendees can claim with proof URLs. AI validators verify each claim.
            </p>
          </div>

          <button type="submit" className="btn-primary w-full py-3.5 text-base" disabled={pending || !valid}>
            {pending
              ? <><div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />Processing...</>
              : !isConnected ? "Connect MetaMask to create"
              : <>Create event <span className="font-mono opacity-70">{CREATE_FEE} GEN</span></>}
          </button>

          {tx.status !== "idle" && tx.status !== "success" && <TxStatus {...tx} />}
        </form>
      </main>
    </div>
  );
}

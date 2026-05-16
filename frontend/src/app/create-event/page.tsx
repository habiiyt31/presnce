"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { TxStatus } from "@/components/TxStatus";
import { useWallet } from "@/hooks/useWallet";
import { toWei, getReadClient, CONTRACT_ADDRESS } from "@/lib/genlayer";
import type { EventRecord } from "@/types";

const CREATE_FEE = "0.01";
const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT || "";

type TxState     = { status: "idle"|"pending"|"success"|"error"; hash?: string; message?: string; };
type UploadState = { status: "idle"|"uploading"|"done"|"error"; message?: string; };

const EXAMPLES = [
  {
    name: "GenLayer Builder Meetup — Jakarta",
    description: "Monthly gathering for GenLayer builders and developers in Jakarta. We discuss Intelligent Contracts, share projects, and network. Food and drinks provided.",
    location: "Jakarta, Indonesia",
    event_date: "2026-06-15",
    event_time: "18:00",
    max_attendees: "50",
  },
  {
    name: "Web3 UX Workshop — Online",
    description: "A hands-on workshop covering UX principles for decentralized applications. We review real dApps and critique onboarding flows, wallet integrations, and error states.",
    location: "Online (Zoom)",
    event_date: "2026-06-20",
    event_time: "20:00",
    max_attendees: "100",
  },
];

async function findNewEvent(address: string, knownIds: Set<number>, timeoutMs = 45_000): Promise<EventRecord | null> {
  const client = getReadClient();
  const start  = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const ids = await client.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: "get_organizer_events",
        args: [address] as any,
      }) as Array<number | bigint | string>;
      const newIds = (ids || []).map(Number).filter(id => !knownIds.has(id));
      if (newIds.length > 0) {
        const newest = Math.max(...newIds);
        const ev = await client.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          functionName: "get_event",
          args: [newest] as any,
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
    name: "", description: "", location: "",
    event_date: "", event_time: "", max_attendees: "50",
  });
  const [imageUrl,  setImageUrl]  = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [upload,    setUpload]    = useState<UploadState>({ status: "idle" });
  const [tx,        setTx]        = useState<TxState>({ status: "idle" });
  const [created,   setCreated]   = useState<EventRecord | null>(null);
  const [resolving, setResolving] = useState(false);
  const [exIdx,     setExIdx]     = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const valid = form.name.trim().length >= 3
    && form.description.trim().length >= 20
    && form.location.trim().length >= 2
    && form.event_date.trim().length >= 8
    && Number(form.max_attendees) > 0;

  function fillExample() {
    const ex = EXAMPLES[exIdx % EXAMPLES.length];
    setForm({ name: ex.name, description: ex.description, location: ex.location,
      event_date: ex.event_date, event_time: ex.event_time, max_attendees: ex.max_attendees });
    setExIdx(i => i + 1);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
    setUpload({ status: "uploading", message: "Uploading to IPFS..." });
    try {
      if (!PINATA_JWT) {
        setImageUrl(URL.createObjectURL(file));
        setUpload({ status: "done", message: "Local preview — add PINATA_JWT for IPFS" });
        return;
      }
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", file.name);
      fd.append("network", "public");
      const res = await fetch("https://uploads.pinata.cloud/v3/files", {
        method: "POST",
        headers: { Authorization: `Bearer ${PINATA_JWT}` },
        body: fd,
      });
      if (!res.ok) throw new Error(`Pinata ${res.status}`);
      const data = await res.json();
      const cid  = data?.data?.cid;
      if (!cid) throw new Error("No CID");
      const url = `https://ipfs.io/ipfs/${cid}`;
      setImageUrl(url);
      setUpload({ status: "done", message: "Uploaded to IPFS ✓" });
    } catch (err: any) {
      setUpload({ status: "error", message: err?.message || "Upload failed" });
    }
  }

  function removeImage() {
    setImageUrl(""); setImagePreview(""); setUpload({ status: "idle" });
    if (fileRef.current) fileRef.current.value = "";
  }

  function resetForm() {
    setForm({ name: "", description: "", location: "", event_date: "", event_time: "", max_attendees: "50" });
    setImageUrl(""); setImagePreview(""); setUpload({ status: "idle" });
    setTx({ status: "idle" }); setCreated(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isConnected || !address) { connect(); return; }
    if (!valid) return;

    let knownIds = new Set<number>();
    try {
      const client = getReadClient();
      const ids = await client.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: "get_organizer_events",
        args: [address] as any,
      }) as Array<number | bigint | string>;
      knownIds = new Set((ids || []).map(Number));
    } catch {}

    setTx({ status: "pending", message: "Creating event on-chain..." });
    try {
      const { txHash, timedOut } = await writeContract(
        "create_event",
        [form.name, form.description, form.location, form.event_date, form.event_time, imageUrl, Number(form.max_attendees)],
        toWei(CREATE_FEE)
      );
      setTx({ status: timedOut ? "pending" : "success", hash: txHash, message: "Event created! Resolving ID..." });
      setResolving(true);
      const ev = await findNewEvent(address, knownIds);
      setResolving(false);
      if (ev) { setCreated(ev); setTx(p => ({ ...p, status: "success", message: "Event live on-chain!" })); }
      else     { setTx(p => ({ ...p, status: "success", message: "Submitted! Check Dashboard." })); }
    } catch (err: any) {
      setResolving(false);
      setTx({ status: "error", message: err?.message || "Transaction failed" });
    }
  }

  // ── Success card ────────────────────────────────────────────
  if (created) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
        <Navbar />
        <main style={{ flex: 1, maxWidth: 680, margin: "0 auto", width: "100%", padding: "clamp(28px,4vw,48px) clamp(16px,4vw,24px)" }}>
          <div className="animate-fade-up">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--verify-green)" }} />
              <p className="section-label">Event created on-chain</p>
            </div>
            <h1 style={{ fontSize: "clamp(24px,4vw,36px)", fontWeight: 800, letterSpacing: "-.03em", marginBottom: 6 }}>
              Your event is live.
            </h1>
            <p style={{ fontSize: 14, color: "var(--ink-3)", marginBottom: 28 }}>
              Share the event ID with attendees so they can claim attendance.
            </p>

            <div className="card" style={{ padding: "clamp(20px,4vw,32px)", marginBottom: 16, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: "linear-gradient(90deg, var(--teal), #6366F1)" }} />

              {/* Cover image */}
              {(created.image_url || imagePreview) && (
                <div style={{ margin: "-32px -32px 20px", overflow: "hidden", background: "#000" }}>
                  <img src={created.image_url || imagePreview} alt={created.name}
                    style={{ width: "100%", height: "auto", display: "block", maxHeight: 300 }} />
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 12 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-4)", marginBottom: 6 }}>Event ID</div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "clamp(40px,8vw,64px)", fontWeight: 700, color: "var(--teal)", letterSpacing: "-.02em", lineHeight: 1 }}>
                    #{String(created.event_id).padStart(4,"0")}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-4)", marginBottom: 6 }}>Capacity</div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "clamp(40px,8vw,64px)", fontWeight: 700, color: "var(--ink-2)", letterSpacing: "-.02em", lineHeight: 1 }}>
                    {created.max_attendees}
                  </div>
                </div>
              </div>

              <div className="divider" style={{ marginBottom: 16 }} />

              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, overflowWrap: "anywhere" }}>{created.name}</h3>
              <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 16, lineHeight: 1.6, overflowWrap: "anywhere" }}>{created.description}</p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { label: "Date",     value: created.event_date },
                  { label: "Time",     value: (created as any).event_time || "—" },
                  { label: "Location", value: created.location },
                  { label: "Status",   value: "active" },
                ].map(r => (
                  <div key={r.label} style={{ background: "var(--ink-8)", borderRadius: 8, padding: "9px 11px" }}>
                    <div style={{ fontSize: 10, color: "var(--ink-4)", fontWeight: 600, marginBottom: 3 }}>{r.label}</div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "var(--ink-2)", fontWeight: 500, overflowWrap: "anywhere" }}>{r.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {tx.hash && (
              <a href={`https://explorer-studio.genlayer.com/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, padding: "12px 16px", borderRadius: 10, border: "1px solid var(--ink-6)", textDecoration: "none" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-4)", marginBottom: 2, letterSpacing: ".06em", textTransform: "uppercase" }}>Transaction</div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.hash}</div>
                </div>
                <span style={{ fontSize: 16, color: "var(--ink-4)", flexShrink: 0 }}>↗</span>
              </a>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Link href="/dashboard" className="btn-primary" style={{ textAlign: "center" }}>View in Dashboard</Link>
              <button onClick={resetForm} className="btn-secondary">Create another</button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const pending = tx.status === "pending" || resolving;

  // ── Form ────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <main style={{ flex: 1, maxWidth: 680, margin: "0 auto", width: "100%", padding: "clamp(28px,4vw,48px) clamp(16px,4vw,24px)" }}>

        <div style={{ marginBottom: 28 }}>
          <p className="section-label" style={{ marginBottom: 8 }}>Host an event</p>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h1 style={{ fontSize: "clamp(24px,4vw,36px)", fontWeight: 800, letterSpacing: "-.03em", marginBottom: 6 }}>Create event</h1>
              <p style={{ fontSize: 14, color: "var(--ink-3)" }}>
                Fee: <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "var(--teal)", fontWeight: 600 }}>{CREATE_FEE} GEN</span>
              </p>
            </div>
            <button type="button" onClick={fillExample} style={{
              display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
              fontSize: 12, fontWeight: 600, color: "var(--teal)",
              background: "var(--teal-bg)", border: "1px solid var(--teal-border)",
              borderRadius: 8, padding: "7px 14px", cursor: "pointer",
            }}>
              ⚡ Fill example
            </button>
          </div>
        </div>

        {/* Pending state */}
        {pending && (
          <div style={{ marginBottom: 20, background: "var(--teal-bg)", border: "1.5px solid var(--teal-border)", borderRadius: 12, padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--teal)", flexShrink: 0 }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--teal)" }}>
                {resolving ? "Resolving event ID..." : "Creating event on-chain..."}
              </p>
            </div>
            <p style={{ fontSize: 12, color: "var(--ink-3)" }}>Usually takes 30–60 seconds.</p>
          </div>
        )}

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 22, opacity: pending ? .5 : 1, pointerEvents: pending ? "none" : "auto" }}>

          {/* Cover image */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 8 }}>
              Cover image <span style={{ fontWeight: 400, color: "var(--ink-4)", textTransform: "none" }}>(optional)</span>
            </label>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />

            {imagePreview ? (
              <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid var(--ink-6)" }}>
                <img src={imagePreview} alt="cover preview"
                  style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }} />
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.35)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, opacity: 0, transition: "opacity .2s" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "0"}>
                  <button type="button" onClick={() => fileRef.current?.click()} style={{
                    background: "#fff", color: "#111", fontSize: 12, fontWeight: 600, padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer",
                  }}>Change</button>
                  <button type="button" onClick={removeImage} style={{
                    background: "rgba(239,68,68,.9)", color: "#fff", fontSize: 12, fontWeight: 600, padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer",
                  }}>Remove</button>
                </div>
                {upload.status === "done" && (
                  <div style={{ position: "absolute", bottom: 10, right: 10, background: "rgba(16,185,129,.9)", color: "#fff", fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20 }}>
                    IPFS ✓
                  </div>
                )}
                {upload.status === "uploading" && (
                  <div style={{ position: "absolute", bottom: 10, right: 10, background: "rgba(0,0,0,.6)", color: "#fff", fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20 }}>
                    Uploading...
                  </div>
                )}
              </div>
            ) : (
              <div onClick={() => fileRef.current?.click()} style={{
                border: "2px dashed var(--ink-5)", borderRadius: 12, padding: "28px 24px",
                cursor: "pointer", textAlign: "center", transition: "border-color .15s, background .15s",
                background: "var(--ink-8)",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--teal)"; (e.currentTarget as HTMLElement).style.background = "var(--teal-bg)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--ink-5)"; (e.currentTarget as HTMLElement).style.background = "var(--ink-8)"; }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🖼️</div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2)", marginBottom: 4 }}>Click to upload cover image</p>
                <p style={{ fontSize: 11, color: "var(--ink-4)" }}>PNG, JPG, WEBP — uploaded permanently to IPFS</p>
              </div>
            )}
          </div>

          {/* Name */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 8 }}>
              Event name *
            </label>
            <input type="text" className="input-field" placeholder="GenLayer Builder Meetup"
              value={form.name} onChange={e => set("name", e.target.value)} minLength={3} required />
          </div>

          {/* Description */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 8 }}>
              Description * <span style={{ fontWeight: 400, color: "var(--ink-4)", textTransform: "none" }}>(min 20 chars)</span>
            </label>
            <textarea className="input-field" rows={4}
              placeholder="What is this event about? Who should attend? What will happen?"
              value={form.description} onChange={e => set("description", e.target.value)} minLength={20} required />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
              <span style={{ fontSize: 11, color: form.description.length >= 20 ? "var(--verify-green)" : "var(--ink-4)" }}>
                {form.description.length} chars
              </span>
            </div>
          </div>

          {/* Location */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 8 }}>
              Location *
            </label>
            <input type="text" className="input-field"
              placeholder="Jakarta, Indonesia or Online (Zoom)"
              value={form.location} onChange={e => set("location", e.target.value)} required />
            <p style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 4 }}>
              Google Maps will show this location on the event page.
            </p>
          </div>

          {/* Date + Time side by side */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 8 }}>
                Date *
              </label>
              <input type="date" className="input-field"
                value={form.event_date} onChange={e => set("event_date", e.target.value)} required />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 8 }}>
                Time <span style={{ fontWeight: 400, color: "var(--ink-4)", textTransform: "none" }}>(optional)</span>
              </label>
              <input type="time" className="input-field"
                value={form.event_time} onChange={e => set("event_time", e.target.value)} />
            </div>
          </div>

          {/* Max attendees */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 8 }}>
              Max attendees *
            </label>
            <input type="number" min="1" max="10000" className="input-field"
              value={form.max_attendees} onChange={e => set("max_attendees", e.target.value)} required />
            <p style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 4 }}>
              Attendance claims are capped at this number.
            </p>
          </div>

          {/* Info note */}
          <div className="card" style={{ padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--teal)", marginTop: 5, flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.6 }}>
              Fee: <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "var(--teal)", fontWeight: 600 }}>{CREATE_FEE} GEN</span>.
              After creation, attendees submit a proof URL and AI validators verify their attendance automatically.
            </p>
          </div>

          {/* Submit */}
          <button type="submit" className="btn-primary" style={{ fontSize: 15, padding: "13px 0", width: "100%" }}
            disabled={pending || !valid || upload.status === "uploading"}>
            {pending
              ? <><div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 1s linear infinite" }} /> Processing...</>
              : !isConnected ? "Connect wallet to create"
              : upload.status === "uploading" ? "Uploading image..."
              : <>Create event · <span style={{ opacity: .75, fontFamily: "'JetBrains Mono',monospace" }}>{CREATE_FEE} GEN</span></>
            }
          </button>

          {tx.status !== "idle" && tx.status !== "success" && <TxStatus {...tx} />}
        </form>

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </main>
    </div>
  );
}

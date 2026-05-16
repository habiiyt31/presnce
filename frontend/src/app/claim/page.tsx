"use client";
import { useState, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { TxStatus } from "@/components/TxStatus";
import { useWallet } from "@/hooks/useWallet";
import { useEvent } from "@/hooks/useContract";
import { toWei, getReadClient, CONTRACT_ADDRESS } from "@/lib/genlayer";
import { formatDate } from "@/lib/utils";
import type { AttendanceRecord } from "@/types";

const CLAIM_FEE  = "0.005";
const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT || "";

type TxState     = { status: "idle"|"pending"|"success"|"error"; hash?: string; message?: string; };
type UploadState = { status: "idle"|"uploading"|"done"|"error"; message?: string; };

async function findNewAttendance(address: string, knownIds: Set<number>, timeoutMs = 90_000): Promise<AttendanceRecord | null> {
  const client = getReadClient();
  const start  = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const ids = await client.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: "get_attendee_history",
        args: [address] as any,
      }) as Array<number | bigint | string>;
      const newIds = (ids || []).map(Number).filter(id => !knownIds.has(id));
      if (newIds.length > 0) {
        const newest = Math.max(...newIds);
        const att = await client.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          functionName: "get_attendance",
          args: [newest] as any,
        }) as any;
        if (att && att.attendance_id !== undefined) return att as AttendanceRecord;
      }
    } catch {}
    await new Promise(r => setTimeout(r, 3000));
  }
  return null;
}

function ClaimForm() {
  const params = useSearchParams();
  const { address, isConnected, connect, writeContract } = useWallet();
  const [eventId,   setEventId]   = useState(params.get("event_id") || "");
  const [proofUrl,  setProofUrl]  = useState("");
  const [tx,        setTx]        = useState<TxState>({ status: "idle" });
  const [upload,    setUpload]    = useState<UploadState>({ status: "idle" });
  const [fileName,  setFileName]  = useState("");
  const [resolving, setResolving] = useState(false);
  const [claimed,   setClaimed]   = useState<AttendanceRecord | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { event, loading } = useEvent(eventId);

  const valid   = eventId !== "" && !isNaN(Number(eventId)) && proofUrl.trim().length > 0 && event !== null && !event.is_closed;
  const pending = tx.status === "pending" || resolving;

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setUpload({ status: "uploading", message: "Uploading to IPFS..." });
    try {
      if (!PINATA_JWT) {
        setProofUrl(URL.createObjectURL(file));
        setUpload({ status: "done", message: "Local preview only" });
        return;
      }
      const fd = new FormData();
      fd.append("file", file); fd.append("name", file.name); fd.append("network", "public");
      const res = await fetch("https://uploads.pinata.cloud/v3/files", {
        method: "POST", headers: { Authorization: `Bearer ${PINATA_JWT}` }, body: fd,
      });
      if (!res.ok) throw new Error(`Pinata ${res.status}`);
      const data = await res.json();
      const cid  = data?.data?.cid;
      if (!cid) throw new Error("No CID");
      setProofUrl(`https://ipfs.io/ipfs/${cid}`);
      setUpload({ status: "done", message: "Uploaded to IPFS ✓" });
    } catch (err: any) {
      setUpload({ status: "error", message: err?.message || "Upload failed" });
    }
  }

  function resetForm() {
    setProofUrl(""); setFileName(""); setUpload({ status: "idle" });
    setTx({ status: "idle" }); setClaimed(null);
  }

  async function fetchTweetData(url: string): Promise<string> {
    const isTweet = /(?:twitter\.com|x\.com)\/[^/]+\/status\/\d+/.test(url);
    if (!isTweet) return "";
    try {
      const res = await fetch("/api/twitter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tweetUrl: url }),
      });
      const data = await res.json();
      console.log("[fetchTweetData] status:", res.status, "data:", data);
      if (!res.ok) {
        console.error("[fetchTweetData] error:", data);
        return "";
      }
      return JSON.stringify(data);
    } catch (e) {
      console.error("[fetchTweetData] exception:", e);
      return "";
    }
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
        functionName: "get_attendee_history",
        args: [address] as any,
      }) as Array<number | bigint | string>;
      knownIds = new Set((ids || []).map(Number));
    } catch {}

    // Fetch tweet data from twitterapi.io via server proxy
    setTx({ status: "pending", message: "Fetching proof data..." });
    const tweetData = await fetchTweetData(proofUrl);

    setTx({ status: "pending", message: "Submitting proof... AI validators are verifying." });
    try {
      const { txHash, timedOut } = await writeContract(
        "claim_attendance", [Number(eventId), proofUrl, tweetData], toWei(CLAIM_FEE)
      );
      setTx({ status: timedOut ? "pending" : "success", hash: txHash, message: "Resolving verdict..." });
      setResolving(true);
      const att = await findNewAttendance(address, knownIds);
      setResolving(false);
      if (att) { setClaimed(att); setTx(p => ({ ...p, status: "success" })); }
      else      { setTx(p => ({ ...p, status: "success", message: "Submitted! Check Dashboard for verdict." })); }
    } catch (err: any) {
      setResolving(false);
      setTx({ status: "error", message: err?.message || "Transaction failed" });
    }
  }

  // Success card
  if (claimed) {
    const isValid  = claimed.verdict === "valid";
    const verdictColor = isValid ? "var(--verify-green)" : claimed.verdict === "insufficient" ? "var(--verify-amber)" : "var(--verify-red)";
    const verdictBg    = isValid ? "rgba(16,185,129,.06)" : claimed.verdict === "insufficient" ? "rgba(245,158,11,.06)" : "rgba(239,68,68,.06)";

    return (
      <div className="animate-fade-up">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: verdictColor }} />
          <p className="section-label">AI verdict received</p>
        </div>
        <h1 style={{ fontSize: "clamp(24px,4vw,36px)", fontWeight: 800, letterSpacing: "-.03em", marginBottom: 28 }}>
          {isValid ? "Attendance verified!" : claimed.verdict === "insufficient" ? "Insufficient proof." : "Claim rejected."}
        </h1>

        <div className="card" style={{ padding: "clamp(20px,4vw,32px)", marginBottom: 16, borderTop: `3px solid ${verdictColor}` }}>
          {/* Attendance ID */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-4)", marginBottom: 6 }}>Attendance ID</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "clamp(36px,6vw,56px)", fontWeight: 700, color: "var(--teal)", letterSpacing: "-.02em", lineHeight: 1 }}>
              #{String(claimed.attendance_id).padStart(4,"0")}
            </div>
          </div>

          <div className="divider" style={{ marginBottom: 16 }} />

          {/* Verdict — clear text, no % */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: verdictColor, flexShrink: 0 }} />
            <div style={{ fontSize: 18, fontWeight: 700, color: verdictColor }}>
              {isValid ? "Attendance verified" : claimed.verdict === "insufficient" ? "Proof insufficient" : "Not verified"}
            </div>
          </div>

          {/* Event */}
          <div style={{ background: "var(--ink-8)", borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: "var(--ink-4)", fontWeight: 600, marginBottom: 3 }}>Event</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: "var(--ink-2)" }}>#{String(claimed.event_id).padStart(4,"0")}</div>
          </div>

          {/* AI reason */}
          {claimed.reason && (
            <div style={{ background: verdictBg, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "var(--ink-3)", fontStyle: "italic", lineHeight: 1.6 }}>
              "{claimed.reason}"
            </div>
          )}
        </div>

        {tx.hash && (
          <a href={`https://explorer-studio.genlayer.com/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, padding: "12px 16px", borderRadius: 10, border: "1px solid var(--ink-6)", textDecoration: "none" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-4)", marginBottom: 2, letterSpacing: ".06em", textTransform: "uppercase" }}>Transaction</div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.hash}</div>
            </div>
            <span style={{ color: "var(--ink-4)", flexShrink: 0 }}>↗</span>
          </a>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Link href="/dashboard" className="btn-primary" style={{ textAlign: "center" }}>
            {isValid ? "Mint certificate →" : "View in Dashboard"}
          </Link>
          <button onClick={resetForm} className="btn-secondary">Claim another</button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Event ID */}
      <div>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 8 }}>
          Event ID *
        </label>
        <input type="number" min="0" className="input-field" placeholder="0"
          value={eventId} onChange={e => setEventId(e.target.value)} required />
        <p style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 4 }}>Find the event ID on the Explore page.</p>
      </div>

      {/* Event preview */}
      {loading && <div className="skeleton" style={{ height: 80 }} />}
      {event && !loading && (
        <div className="card" style={{ padding: "16px 18px", borderLeft: "3px solid var(--verify-green)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <p className="section-label" style={{ color: "var(--verify-green)" }}>Event found</p>
            {event.is_closed && <span className="badge badge-closed">closed</span>}
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, overflowWrap: "anywhere" }}>{event.name}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 10 }}>
            {[
              { label: "Date", value: formatDate(event.event_date) },
              { label: "Location", value: event.location },
              { label: "Spots left", value: String(event.max_attendees - event.attendee_count) },
            ].map(r => (
              <div key={r.label}>
                <div style={{ fontSize: 10, color: "var(--ink-4)", fontWeight: 600, marginBottom: 2 }}>{r.label}</div>
                <div style={{ fontSize: 12, color: "var(--ink-2)", overflowWrap: "anywhere" }}>{r.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {eventId !== "" && !loading && !event && (
        <div className="card" style={{ padding: "12px 16px", borderLeft: "3px solid var(--verify-red)" }}>
          <p style={{ fontSize: 13, color: "var(--verify-red)" }}>No event found with ID {eventId}</p>
        </div>
      )}
      {event?.is_closed && (
        <div className="card" style={{ padding: "12px 16px", borderLeft: "3px solid var(--verify-red)" }}>
          <p style={{ fontSize: 13, color: "var(--verify-red)" }}>This event is closed.</p>
        </div>
      )}

      {/* Consensus visualizer */}
      {pending && (
        <div className="card" style={{ padding: "16px 18px", borderLeft: "3px solid var(--teal)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--teal)", flexShrink: 0 }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--teal)" }}>
              {resolving ? "Reading AI verdict..." : "AI validators verifying your proof..."}
            </p>
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            {[0,1,2,3,4].map(i => (
              <div key={i} className="con-bar">
                <div className="con-bar-fill" style={{ animationDelay: `${i * 150}ms` }} />
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: "var(--ink-4)" }}>5 validators independently judge your proof. Takes 30–90 seconds.</p>
        </div>
      )}

      {/* Proof upload */}
      <div style={{ opacity: pending ? .5 : 1, pointerEvents: pending ? "none" : "auto" }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 8 }}>
          Proof of attendance *
        </label>

        {/* Upload area */}
        <div onClick={() => fileRef.current?.click()} style={{
          border: `2px dashed ${upload.status === "done" ? "var(--verify-green)" : upload.status === "error" ? "var(--verify-red)" : "var(--ink-5)"}`,
          borderRadius: 12, padding: "18px 20px", cursor: "pointer", marginBottom: 12,
          background: upload.status === "done" ? "rgba(16,185,129,.04)" : "var(--ink-8)",
          display: "flex", alignItems: "center", gap: 12, transition: "border-color .15s",
        }}>
          <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={handleFileUpload} style={{ display: "none" }} />
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--surface)", border: "1px solid var(--ink-6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 18 }}>
            {upload.status === "uploading" ? "⏳" : upload.status === "done" ? "✓" : upload.status === "error" ? "✕" : "📎"}
          </div>
          <div>
            {fileName
              ? <><p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2)" }}>{fileName}</p>{upload.message && <p style={{ fontSize: 11, color: upload.status === "error" ? "var(--verify-red)" : "var(--verify-green)", marginTop: 2 }}>{upload.message}</p>}</>
              : <><p style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-2)" }}>Upload photo or ticket</p><p style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 2 }}>PNG, JPG, PDF — uploaded to IPFS permanently</p></>
            }
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div className="divider" />
          <span style={{ fontSize: 11, color: "var(--ink-4)", flexShrink: 0 }}>or paste a URL</span>
          <div className="divider" />
        </div>

        <input type="text" className="input-field"
          placeholder="https://x.com/you/status/... or any public URL"
          value={proofUrl}
          onChange={e => { setProofUrl(e.target.value); if (e.target.value) { setFileName(""); setUpload({ status: "idle" }); } }} />
        <p style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 4 }}>
          Tweet mentioning the event, RSVP link, ticket, or photo on IPFS.
        </p>
      </div>

      {/* Info */}
      <div className="card" style={{ padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--teal)", marginTop: 5, flexShrink: 0 }} />
        <p style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.6 }}>
          Fee: <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "var(--teal)", fontWeight: 600 }}>{CLAIM_FEE} GEN</span> (non-refundable, anti-spam).
          Valid attendance lets you mint a free on-chain certificate.
        </p>
      </div>

      <button type="submit" className="btn-primary" style={{ fontSize: 15, padding: "13px 0", width: "100%" }}
        disabled={pending || !valid}>
        {pending
          ? <><div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 1s linear infinite" }} /> Verifying...</>
          : !isConnected ? "Connect wallet"
          : <>Claim attendance · <span style={{ opacity: .75, fontFamily: "'JetBrains Mono',monospace" }}>{CLAIM_FEE} GEN</span></>
        }
      </button>

      {tx.status !== "idle" && tx.status !== "success" && <TxStatus {...tx} />}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </form>
  );
}

export default function ClaimPage() {
  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <main style={{ flex: 1, maxWidth: 680, margin: "0 auto", width: "100%", padding: "clamp(28px,4vw,48px) clamp(16px,4vw,24px)" }}>
        <div style={{ marginBottom: 28 }}>
          <p className="section-label" style={{ marginBottom: 8 }}>Attendance verification</p>
          <h1 style={{ fontSize: "clamp(24px,4vw,36px)", fontWeight: 800, letterSpacing: "-.03em", marginBottom: 6 }}>
            Claim attendance
          </h1>
          <p style={{ fontSize: 14, color: "var(--ink-3)" }}>
            Upload photo or paste URL. AI judges. Fee: <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "var(--teal)", fontWeight: 600 }}>{CLAIM_FEE} GEN</span>
          </p>
        </div>
        <Suspense fallback={<div className="skeleton" style={{ height: 400 }} />}>
          <ClaimForm />
        </Suspense>
      </main>
    </div>
  );
}

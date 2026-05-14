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

async function findNewAttendance(
  address: string,
  eventId: number,
  knownIds: Set<number>,
  timeoutMs = 60_000
): Promise<AttendanceRecord | null> {
  const client = getReadClient();
  const start  = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const ids = await client.readContract({
        address:      CONTRACT_ADDRESS as `0x${string}`,
        functionName: "get_attendee_history",
        args:         [address] as any,
      }) as Array<number | bigint | string>;

      const newIds = (ids || []).map(Number).filter(id => !knownIds.has(id));
      if (newIds.length > 0) {
        const newest = Math.max(...newIds);
        const att = await client.readContract({
          address:      CONTRACT_ADDRESS as `0x${string}`,
          functionName: "get_attendance",
          args:         [newest] as any,
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
  const [eventId,   setEventId]  = useState(params.get("event_id") || "");
  const [proofUrl,  setProofUrl] = useState("");
  const [tx, setTx]              = useState<TxState>({ status: "idle" });
  const [upload, setUpload]      = useState<UploadState>({ status: "idle" });
  const [fileName, setFileName]  = useState("");
  const [resolving, setResolving] = useState(false);
  const [claimed, setClaimed]    = useState<AttendanceRecord | null>(null);
  const fileRef                  = useRef<HTMLInputElement>(null);
  const { event, loading }       = useEvent(eventId);

  const valid = eventId !== "" && !isNaN(Number(eventId)) &&
    proofUrl.trim().length > 0 && event !== null && !event.is_closed;
  const pending = tx.status === "pending" || resolving;

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setUpload({ status: "uploading", message: "Uploading to IPFS via Pinata..." });
    try {
      if (!PINATA_JWT) {
        setProofUrl(URL.createObjectURL(file));
        setUpload({ status: "done", message: "Loaded locally. Add NEXT_PUBLIC_PINATA_JWT for IPFS." });
        return;
      }
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", file.name);
      formData.append("network", "public");
      const res = await fetch("https://uploads.pinata.cloud/v3/files", {
        method: "POST", headers: { Authorization: `Bearer ${PINATA_JWT}` }, body: formData,
      });
      if (!res.ok) throw new Error(`Pinata ${res.status}: ${await res.text()}`);
      const data = await res.json();
      const cid  = data?.data?.cid;
      if (!cid) throw new Error("No CID returned");
      const url = `https://ipfs.io/ipfs/${cid}`;
      setProofUrl(url);
      setUpload({ status: "done", message: `Uploaded: ${url}` });
    } catch (err: any) {
      setUpload({ status: "error", message: err?.message || "Upload failed" });
    }
  }

  function resetForm() {
    setProofUrl(""); setFileName(""); setUpload({ status: "idle" });
    setTx({ status: "idle" }); setClaimed(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isConnected || !address) { connect(); return; }
    if (!valid) return;

    // Snapshot known attendance IDs
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

    setTx({ status: "pending", message: "Submitting proof... AI validators are verifying your attendance." });
    try {
      const { txHash, timedOut } = await writeContract(
        "claim_attendance",
        [Number(eventId), proofUrl],
        toWei(CLAIM_FEE)
      );
      setTx({
        status:  timedOut ? "pending" : "success",
        hash:    txHash,
        message: "Resolving verdict...",
      });
      setResolving(true);
      const att = await findNewAttendance(address, Number(eventId), knownIds);
      setResolving(false);
      if (att) {
        setClaimed(att);
        setTx(p => ({ ...p, status: "success" }));
      } else {
        setTx(p => ({ ...p, status: "success", message: "Submitted. Check My Events for the verdict." }));
      }
    } catch (err: any) {
      setResolving(false);
      setTx({ status: "error", message: err?.message || "Transaction failed" });
    }
  }

  // Success card
  if (claimed) {
    const verdictStyle =
      claimed.verdict === "valid"        ? { color: "text-sage-light", border: "border-sage/30 bg-sage/5",     label: "Valid" } :
      claimed.verdict === "insufficient" ? { color: "text-amber",      border: "border-amber/30 bg-amber/5",   label: "Insufficient" } :
                                           { color: "text-rust",       border: "border-rust/30 bg-rust/5",     label: "Invalid" };
    return (
      <div className="animate-fade-up">
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-2 h-2 rounded-full animate-pulse ${
            claimed.verdict === "valid" ? "bg-sage-light" :
            claimed.verdict === "insufficient" ? "bg-amber" : "bg-rust"
          }`} />
          <p className="section-label">AI verdict received</p>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink-50 mb-8">
          {claimed.verdict === "valid" ? "Attendance verified!" :
           claimed.verdict === "insufficient" ? "Insufficient proof." : "Claim rejected."}
        </h1>

        <div className={`relative border rounded-sm p-6 sm:p-8 mb-6 overflow-hidden ${verdictStyle.border}`}>
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10 pointer-events-none"
            style={{ background: "radial-gradient(circle, #7C5CBF 0%, transparent 70%)" }} />

          <div className="flex items-start justify-between mb-6 gap-4">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-violet/60 mb-1">Attendance ID</p>
              <p className="font-display text-5xl sm:text-6xl font-bold text-violet-light leading-none">
                #{String(claimed.attendance_id).padStart(4,"0")}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-mono uppercase tracking-wider text-ink-500 mb-1">Confidence</p>
              <p className={`font-display text-5xl sm:text-6xl font-bold leading-none ${verdictStyle.color}`}>
                {claimed.confidence}%
              </p>
            </div>
          </div>

          <div className="mb-6">
            <div className="h-1 bg-ink-700 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-violet to-violet-light" style={{ width: `${claimed.confidence}%` }} />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-ink-500 mt-1">
              <span>uncertain</span><span>likely</span><span>verified</span>
            </div>
          </div>

          <div className="divider mb-5" />

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-ink-500 mb-1">Verdict</p>
              <p className={`font-mono uppercase ${verdictStyle.color}`}>{verdictStyle.label}</p>
            </div>
            <div>
              <p className="text-ink-500 mb-1">Event ID</p>
              <p className="font-mono text-ink-200">#{String(claimed.event_id).padStart(4,"0")}</p>
            </div>
          </div>

          {claimed.reason && (
            <div className="mt-4 pt-4 border-t border-ink-700/50">
              <p className="text-[10px] font-mono uppercase tracking-wider text-ink-500 mb-1">AI Reasoning</p>
              <p className="text-xs text-ink-300 italic">"{claimed.reason}"</p>
            </div>
          )}
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
          <Link href="/my-events" className="btn-primary text-center">
            {claimed.verdict === "valid" ? "Mint certificate →" : "View in My Events"}
          </Link>
          <button onClick={resetForm} className="btn-secondary">Claim another</button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5 animate-fade-up delay-100">
      <div>
        <label className="block text-xs font-mono text-ink-400 mb-2 uppercase tracking-wider">Event ID *</label>
        <input type="number" min="0" className="input-field" placeholder="0"
          value={eventId} onChange={e => setEventId(e.target.value)} required />
        <p className="mt-1 text-xs text-ink-500">event_id starts from 0. Find it on the Explore page.</p>
      </div>

      {loading && <div className="card p-4 space-y-2"><div className="skeleton h-4 w-2/3" /><div className="skeleton h-3 w-full" /></div>}
      {event && !loading && (
        <div className="card p-4 border-sage/20 animate-fade-in">
          <div className="flex items-start justify-between mb-3">
            <p className="section-label text-sage-light">Event found</p>
            <div className="flex gap-2">
              {event.is_verified_org && <span className="badge-verified">verified</span>}
              {event.is_closed        && <span className="badge-closed">closed</span>}
            </div>
          </div>
          <p className="font-display text-sm font-semibold text-ink-100 mb-1">{event.name}</p>
          <p className="text-xs text-ink-400 mb-3 line-clamp-2">{event.description}</p>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div><p className="text-ink-500">Date</p><p className="font-mono text-ink-200">{formatDate(event.event_date)}</p></div>
            <div><p className="text-ink-500">Location</p><p className="text-ink-200 truncate">{event.location}</p></div>
            <div><p className="text-ink-500">Spots left</p><p className="font-mono text-ink-200">{event.max_attendees - event.attendee_count}</p></div>
          </div>
        </div>
      )}
      {eventId !== "" && !loading && !event && (
        <div className="card p-3 border-rust/20"><p className="text-xs text-rust">No event found with ID {eventId}</p></div>
      )}
      {event?.is_closed && (
        <div className="card p-3 border-rust/20"><p className="text-xs text-rust">This event is closed.</p></div>
      )}

      {/* Consensus visualizer */}
      {pending && (
        <div className="border border-violet/30 bg-violet/5 rounded-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-2 rounded-full bg-violet-light animate-pulse" />
            <p className="text-sm font-medium text-violet-light">
              {resolving ? "Reading AI verdict..." : "AI validators are verifying your attendance"}
            </p>
          </div>
          <div className="grid grid-cols-5 gap-1.5 mb-2">
            {[0,1,2,3,4].map(i => (
              <div key={i} className="h-1 bg-violet/20 overflow-hidden">
                <div className="h-full bg-violet animate-pulse"
                  style={{ animationDelay: `${i * 150}ms`, animationDuration: "1.4s" }} />
              </div>
            ))}
          </div>
          <p className="text-xs text-ink-400">5 validators independently judge your proof. Takes 30–90 seconds.</p>
        </div>
      )}

      <div className={pending ? "opacity-50 pointer-events-none space-y-5" : "space-y-5"}>
        <div>
          <label className="block text-xs font-mono text-ink-400 mb-2 uppercase tracking-wider">Proof of attendance *</label>
          <div onClick={() => fileRef.current?.click()}
            className={`card p-4 mb-3 cursor-pointer transition-all duration-200 flex items-center gap-3 ${
              upload.status === "done"      ? "border-sage/40 bg-sage/5"     :
              upload.status === "error"     ? "border-rust/40 bg-rust/5"     :
              upload.status === "uploading" ? "border-violet/40 bg-violet/5" :
              "hover:border-violet/40 hover:bg-ink-700"
            }`}>
            <input ref={fileRef} type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileUpload} />
            <div className="w-8 h-8 border border-ink-500 flex items-center justify-center shrink-0">
              {upload.status === "uploading" ? <div className="w-3 h-3 border border-violet-light border-t-transparent rounded-full animate-spin" />
               : upload.status === "done"    ? <div className="w-3 h-3 rounded-full bg-sage-light" />
               : upload.status === "error"   ? <div className="w-3 h-3 rounded-full bg-rust" />
               : <svg className="w-4 h-4 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                 </svg>}
            </div>
            <div className="flex-1 min-w-0">
              {fileName ? (
                <>
                  <p className="text-sm text-ink-100 truncate">{fileName}</p>
                  {upload.message && <p className={`text-xs mt-0.5 truncate ${
                    upload.status === "error" ? "text-rust" : upload.status === "done" ? "text-sage-light" : "text-violet-light"
                  }`}>{upload.message}</p>}
                </>
              ) : (
                <>
                  <p className="text-sm text-ink-200">Upload photo or ticket (IPFS via Pinata)</p>
                  <p className="text-xs text-ink-500 mt-0.5">PNG, JPG, PDF — uploaded permanently to IPFS</p>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-px bg-ink-700" />
            <span className="text-xs text-ink-500">or paste a URL</span>
            <div className="flex-1 h-px bg-ink-700" />
          </div>
          <input type="text" className="input-field"
            placeholder="https://twitter.com/you/status/... or https://lu.ma/event/..."
            value={proofUrl}
            onChange={e => { setProofUrl(e.target.value); if (e.target.value) { setFileName(""); setUpload({ status: "idle" }); } }} />
          <p className="mt-1 text-xs text-ink-500">
            Any public URL: tweet, RSVP, ticket, check-in post, or IPFS photo. Intelligent Contract fetches this URL directly.
          </p>
        </div>

        <div className="card p-4 space-y-2">
          <p className="section-label mb-2">What GenLayer does</p>
          {[
            "Intelligent Contract fetches your proof URL from the internet",
            "AI validators compare content against the event details",
            "5 validators independently vote on the verdict",
            "Valid → attendance recorded + certificate mintable for free",
            "Invalid/Insufficient → claim rejected, fee forfeited (anti-spam)",
          ].map((s, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="font-mono text-xs text-violet/50 mt-0.5 shrink-0">{String(i+1).padStart(2,"0")}</span>
              <p className="text-xs text-ink-300">{s}</p>
            </div>
          ))}
        </div>

        <div className="card p-4 flex items-start gap-3">
          <div className="w-1 h-1 rounded-full bg-violet mt-2 shrink-0 animate-pulse" />
          <p className="text-xs text-ink-300 leading-relaxed">
            Fee: <span className="font-mono text-violet-light">{CLAIM_FEE} GEN</span> (non-refundable, anti-spam).
            Valid attendance lets you mint a free on-chain certificate.
          </p>
        </div>

        <button type="submit" className="btn-primary w-full py-3.5 text-base" disabled={pending || !valid}>
          {pending
            ? <><div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />Verifying...</>
            : !isConnected ? "Connect MetaMask"
            : <>Claim attendance <span className="font-mono opacity-70">{CLAIM_FEE} GEN</span></>}
        </button>

        {tx.status !== "idle" && tx.status !== "success" && <TxStatus {...tx} />}
      </div>
    </form>
  );
}

export default function ClaimPage() {
  return (
    <div className="min-h-dvh flex flex-col">
      <Navbar />
      <main className="flex-1 px-4 sm:px-6 py-10 max-w-2xl mx-auto w-full">
        <div className="mb-8 animate-fade-up">
          <p className="section-label mb-3">Attendance verification</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink-50 mb-2">Claim attendance</h1>
          <p className="text-sm text-ink-300">
            Upload photo or paste URL. AI judges. Certificate minted.
            Fee: <span className="font-mono text-violet-light">{CLAIM_FEE} GEN</span>
          </p>
        </div>
        <Suspense fallback={<div className="skeleton h-96 w-full" />}>
          <ClaimForm />
        </Suspense>
      </main>
    </div>
  );
}

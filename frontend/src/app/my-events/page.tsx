"use client";
import { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { EventCard } from "@/components/EventCard";
import { TxStatus } from "@/components/TxStatus";
import { useWallet } from "@/hooks/useWallet";
import { useMyEvents, useMyAttendances, useMyCertificates } from "@/hooks/useContract";
import { formatDate } from "@/lib/utils";
import type { AttendanceCertificate } from "@/types";

type TxState = { status: "idle"|"pending"|"success"|"error"; hash?: string; message?: string; };

function CertificateCard({ cert }: { cert: AttendanceCertificate }) {
  return (
    <div className="card p-4 flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <p className="text-[10px] font-mono uppercase tracking-wider text-violet/60">
          Certificate #{String(cert.token_id).padStart(4, "0")}
        </p>
        <span className="badge-verified">verified</span>
      </div>
      <p className="font-display text-sm font-semibold text-ink-100 mb-1 line-clamp-2">{cert.event_name}</p>
      <div className="grid grid-cols-2 gap-2 text-xs mt-3 flex-1">
        <div>
          <p className="text-ink-500">Date</p>
          <p className="font-mono text-ink-300">{formatDate(cert.event_date)}</p>
        </div>
        <div>
          <p className="text-ink-500">Location</p>
          <p className="text-ink-300 truncate">{cert.event_location}</p>
        </div>
        <div>
          <p className="text-ink-500">Confidence</p>
          <p className="font-mono text-violet-light">{cert.confidence}%</p>
        </div>
        <div>
          <p className="text-ink-500">Event ID</p>
          <p className="font-mono text-ink-300">#{String(cert.event_id).padStart(4,"0")}</p>
        </div>
      </div>
      <Link href={`/certificate/${cert.token_id}`}
        className="flex items-center justify-center gap-1 text-xs font-mono text-ink-500 hover:text-violet-light transition-colors w-full py-1 mt-4 border-t border-ink-700">
        View certificate
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  );
}

export default function MyEventsPage() {
  const { address, isConnected, connect, writeContract } = useWallet();
  const { events,      loading: evLoading,   refetch: refetchEv  } = useMyEvents(address);
  const { attendances, loading: attLoading,  refetch: refetchAtt } = useMyAttendances(address);
  const { certs,       loading: certLoading, refetch: refetchCert } = useMyCertificates(address);
  const [tx, setTx]        = useState<TxState>({ status: "idle" });
  const [mintingId, setMinting] = useState<number | null>(null);
  const [closingId, setClosing] = useState<number | null>(null);
  const [tab, setTab]      = useState<"events" | "attendances" | "certificates">("events");

  async function closeEvent(eventId: number) {
    if (!confirm(`Close event #${eventId}? No more attendance claims will be accepted.`)) return;
    setClosing(eventId);
    setTx({ status: "pending", message: `Closing event #${eventId}...` });
    try {
      const { txHash, timedOut } = await writeContract("close_event", [Number(eventId)]);
      setTx({ status: timedOut ? "pending" : "success", hash: txHash, message: `Event #${eventId} closed.` });
      await refetchEv();
    } catch (err: any) {
      setTx({ status: "error", message: err?.message || "Failed to close" });
    } finally {
      setClosing(null);
    }
  }

  async function mintCertificate(attendanceId: number) {
    setMinting(attendanceId);
    setTx({ status: "pending", message: "Minting certificate..." });
    try {
      const { txHash, timedOut } = await writeContract("mint_certificate", [Number(attendanceId)]);
      setTx({ status: timedOut ? "pending" : "success", hash: txHash, message: "Certificate minted!" });
      await refetchAtt();
      await refetchCert();
    } catch (err: any) {
      setTx({ status: "error", message: err?.message || "Mint failed" });
    } finally {
      setMinting(null);
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-dvh flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <div className="w-12 h-12 border border-ink-600 flex items-center justify-center mx-auto mb-6">
              <div className="w-4 h-4 border border-ink-400" />
            </div>
            <h2 className="font-display text-xl font-semibold text-ink-100 mb-2">Connect your wallet</h2>
            <p className="text-sm text-ink-400 mb-6">Connect MetaMask to view your events and certificates.</p>
            <button onClick={connect} className="btn-primary">Connect MetaMask</button>
          </div>
        </main>
      </div>
    );
  }

  const TABS = [
    { key: "events",       label: `Events (${events.length})` },
    { key: "attendances",  label: `Attendances (${attendances.length})` },
    { key: "certificates", label: `Certificates (${certs.length})` },
  ] as const;

  return (
    <div className="min-h-dvh flex flex-col">
      <Navbar />
      <main className="flex-1 px-4 sm:px-6 py-10 max-w-6xl mx-auto w-full">
        <div className="flex items-end justify-between mb-8 gap-4 animate-fade-up">
          <div>
            <p className="section-label mb-2">Your profile</p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink-50">My Events</h1>
          </div>
          <button onClick={() => { refetchEv(); refetchAtt(); refetchCert(); }}
            className="text-xs font-mono text-ink-400 hover:text-violet-light transition-colors px-2 py-1">
            ↻ refresh
          </button>
        </div>

        {tx.status !== "idle" && <div className="mb-6"><TxStatus {...tx} /></div>}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-ink-700 mb-8">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-mono transition-colors border-b-2 -mb-px ${
                tab === t.key
                  ? "text-violet-light border-violet-light"
                  : "text-ink-400 border-transparent hover:text-ink-200"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Events tab */}
        {tab === "events" && (
          <>
            {evLoading && <div className="skeleton h-48 w-full" />}
            {!evLoading && events.length === 0 && (
              <div className="text-center py-20">
                <p className="text-sm text-ink-400 mb-6">You haven't hosted any events yet.</p>
                <Link href="/create-event" className="btn-primary">Host your first event</Link>
              </div>
            )}
            {events.length > 0 && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {events.map(ev => (
                  <div key={Number(ev.event_id)} className="relative group">
                    <EventCard event={ev} />
                    {!ev.is_closed && (
                      <button onClick={() => closeEvent(Number(ev.event_id))}
                        disabled={closingId === Number(ev.event_id)}
                        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-mono text-rust hover:underline px-2 py-1">
                        {closingId === Number(ev.event_id) ? "..." : "close"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Attendances tab */}
        {tab === "attendances" && (
          <>
            {attLoading && <div className="skeleton h-48 w-full" />}
            {!attLoading && attendances.length === 0 && (
              <div className="text-center py-20">
                <p className="text-sm text-ink-400 mb-6">No attendance claims yet.</p>
                <Link href="/events" className="btn-primary">Find an event</Link>
              </div>
            )}
            {attendances.length > 0 && (
              <div className="space-y-3">
                {attendances.map(att => (
                  <div key={Number(att.attendance_id)} className="card p-4 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-[10px] font-mono text-ink-500">
                          Attendance #{String(att.attendance_id).padStart(4,"0")} · Event #{String(att.event_id).padStart(4,"0")}
                        </p>
                        <span className={
                          att.verdict === "valid" ? "badge-valid" :
                          att.verdict === "invalid" ? "badge-invalid" :
                          "badge-insufficient"
                        }>{att.verdict}</span>
                        {att.is_revoked && <span className="badge-closed">revoked</span>}
                      </div>
                      <a href={att.proof_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-ink-400 hover:text-violet-light transition-colors truncate block mb-2">
                        {att.proof_url}
                      </a>
                      {att.reason && (
                        <p className="text-xs text-ink-400 italic line-clamp-1">"{att.reason}"</p>
                      )}
                      <div className="flex items-center gap-1.5 mt-2">
                        <div className="w-24 h-0.5 bg-ink-700">
                          <div className="h-full bg-violet/60" style={{ width: `${att.confidence}%` }} />
                        </div>
                        <span className="text-[10px] font-mono text-ink-500">{att.confidence}% confidence</span>
                      </div>
                    </div>
                    {att.verdict === "valid" && !att.cert_minted && !att.is_revoked && (
                      <button onClick={() => mintCertificate(Number(att.attendance_id))}
                        disabled={mintingId === Number(att.attendance_id)}
                        className="btn-amber text-xs px-3 py-2 shrink-0">
                        {mintingId === Number(att.attendance_id) ? "Minting..." : "Mint cert"}
                      </button>
                    )}
                    {att.cert_minted && (
                      <span className="text-xs font-mono text-violet-light shrink-0">✓ minted</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Certificates tab */}
        {tab === "certificates" && (
          <>
            {certLoading && <div className="skeleton h-48 w-full" />}
            {!certLoading && certs.length === 0 && (
              <div className="text-center py-20">
                <p className="text-sm text-ink-400 mb-6">No certificates yet. Claim attendance at an event to get one.</p>
                <Link href="/events" className="btn-primary">Find an event</Link>
              </div>
            )}
            {certs.length > 0 && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {certs.map(cert => (
                  <CertificateCard key={Number(cert.token_id)} cert={cert} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

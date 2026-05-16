"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { useWallet } from "@/hooks/useWallet";
import { useMyEvents, useMyAttendances, useMyCertificates, useStats } from "@/hooks/useContract";
import { shortAddr, formatDate } from "@/lib/utils";
import { fromWeiStr } from "@/lib/genlayer";
import { TxStatus } from "@/components/TxStatus";
import { useNickname } from "@/hooks/useNickname";

type TxState = { status: "idle"|"pending"|"success"|"error"; hash?: string; message?: string; };



export default function DashboardPage() {
  const { address, isConnected, connect, writeContract } = useWallet();
  const { events,      loading: evLoading,   refetch: refetchEv   } = useMyEvents(address);
  const { nickname, editing, draft, setDraft, save, startEdit, cancelEdit, saving, saveError } = useNickname(address);
  const { attendances, loading: attLoading,  refetch: refetchAtt  } = useMyAttendances(address);
  const { certs,       loading: certLoading, refetch: refetchCert } = useMyCertificates(address);
  const { stats } = useStats();

  const [tx, setTx]           = useState<TxState>({ status: "idle" });
  const [mintingId, setMinting] = useState<number | null>(null);
  const [closingId, setClosing] = useState<number | null>(null);
  const [tab, setTab]           = useState<"overview"|"events"|"claims"|"certificates">("overview");

  async function mintCertificate(attendanceId: number) {
    setMinting(attendanceId);
    setTx({ status: "pending", message: "Minting certificate..." });
    try {
      const { txHash, timedOut } = await writeContract("mint_certificate", [Number(attendanceId)]);
      setTx({ status: timedOut ? "pending" : "success", hash: txHash, message: "Certificate minted!" });
      await refetchAtt(); await refetchCert();
    } catch (err: any) {
      setTx({ status: "error", message: err?.message || "Mint failed" });
    } finally { setMinting(null); }
  }

  async function closeEvent(eventId: number) {
    if (!confirm(`Close event #${eventId}? No more claims will be accepted.`)) return;
    setClosing(eventId);
    setTx({ status: "pending", message: `Closing event #${eventId}...` });
    try {
      const { txHash, timedOut } = await writeContract("close_event", [Number(eventId)]);
      setTx({ status: timedOut ? "pending" : "success", hash: txHash, message: `Event #${eventId} closed.` });
      await refetchEv();
    } catch (err: any) {
      setTx({ status: "error", message: err?.message || "Failed" });
    } finally { setClosing(null); }
  }

  if (!isConnected) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
        <Navbar />
        <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ textAlign: "center", maxWidth: 360 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.02em", marginBottom: 8 }}>
              Connect your wallet
            </h2>
            <p style={{ fontSize: 14, color: "var(--ink-3)", marginBottom: 24, lineHeight: 1.6 }}>
              Connect MetaMask to view your events, claims, and certificates.
            </p>
            <button onClick={connect} className="btn-primary" style={{ fontSize: 14 }}>
              Connect wallet
            </button>
          </div>
        </main>
      </div>
    );
  }

  const validClaims   = attendances.filter(a => a.verdict === "valid");
  const pendingMint   = validClaims.filter(a => !a.cert_minted && !a.is_revoked);
  const activeEvents  = events.filter(e => !e.is_closed);

  const TABS = [
    { key: "overview",     label: "Overview"                                         },
    { key: "events",       label: `My Events (${events.length})`                     },
    { key: "claims",       label: `Claims (${attendances.length})`                   },
    { key: "certificates", label: `Certificates (${certs.length})`                   },
  ] as const;

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      <Navbar />
      <main style={{ flex: 1, maxWidth: 1100, margin: "0 auto", width: "100%", padding: "clamp(28px,4vw,48px) clamp(16px,4vw,24px)" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div className="section-label" style={{ marginBottom: 8 }}>Personal dashboard</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              {editing ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    autoFocus
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") save(draft); if (e.key === "Escape") cancelEdit(); }}
                    maxLength={32}
                    placeholder="Enter your nickname..."
                    style={{
                      fontSize: "clamp(18px,3vw,26px)", fontWeight: 800, letterSpacing: "-.03em",
                      border: "none", borderBottom: "2px solid var(--teal)", background: "transparent",
                      outline: "none", color: "var(--ink)", padding: "0 4px", width: "clamp(180px,40vw,320px)",
                    }}
                  />
                  <button onClick={() => save(draft)} className="btn-primary" style={{ padding: "6px 14px", fontSize: 12 }} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
                  <button onClick={cancelEdit} className="btn-secondary" style={{ padding: "6px 14px", fontSize: 12 }}>Cancel</button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <h1 style={{ fontSize: "clamp(22px,4vw,32px)", fontWeight: 800, letterSpacing: "-.03em" }}>
                    {nickname || shortAddr(address!)}
                  </h1>
                  <button onClick={startEdit} style={{
                    fontSize: 11, color: "var(--ink-4)", background: "var(--ink-8)",
                    border: "1px solid var(--ink-6)", borderRadius: 6, padding: "3px 10px",
                    cursor: "pointer", fontWeight: 500,
                  }}>
                    {nickname ? "Edit" : "Set nickname"}
                  </button>
                </div>
              )}
              {saveError && (
                <div style={{ fontSize: 11, color: "var(--verify-amber)", marginTop: 4 }}>
                  ⚠ {saveError}
                </div>
              )}
              {nickname && (
                <div style={{ fontSize: 12, color: "var(--ink-4)", marginTop: 4, fontFamily: "'JetBrains Mono',monospace" }}>
                  {shortAddr(address!)}
                </div>
              )}
            </div>
            <button
              onClick={() => { refetchEv(); refetchAtt(); refetchCert(); }}
              style={{ fontSize: 12, color: "var(--ink-4)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
            >
              ↻ refresh
            </button>
          </div>
        </div>

        {tx.status !== "idle" && <div style={{ marginBottom: 20 }}><TxStatus {...tx} /></div>}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 2, borderBottom: "1px solid var(--ink-6)", marginBottom: 28, overflowX: "auto" }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)} style={{
              padding: "10px 16px", background: "none", border: "none",
              borderBottom: tab === t.key ? "2px solid var(--teal)" : "2px solid transparent",
              marginBottom: -1, cursor: "pointer", whiteSpace: "nowrap",
              fontSize: 13, fontWeight: tab === t.key ? 600 : 500,
              color: tab === t.key ? "var(--teal)" : "var(--ink-3)",
              transition: "color .15s",
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Overview tab ── */}
        {tab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Stats cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 14 }}>
              {[
                { label: "Events hosted",   value: events.length,      sub: `${activeEvents.length} active`,           accent: "var(--teal)"   },
                { label: "Attendance claims", value: attendances.length, sub: `${validClaims.length} verified`,         accent: "#6366F1"       },
                { label: "Certificates",    value: certs.length,        sub: pendingMint.length > 0 ? `${pendingMint.length} ready to mint` : "up to date", accent: "#10B981" },
                { label: "Platform total",  value: Number(stats?.total_events ?? 0), sub: `${Number(stats?.total_attendances ?? 0)} attendance claims`, accent: "var(--ink-4)" },
              ].map(s => (
                <div key={s.label} className="card" style={{ padding: "20px 22px" }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: s.accent, letterSpacing: "-.03em", lineHeight: 1 }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginTop: 6 }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 2 }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Pending mint alert */}
            {pendingMint.length > 0 && (
              <div style={{
                background: "#F0FDF9", border: "1.5px solid var(--teal-border)",
                borderRadius: 12, padding: "16px 20px",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18 }}>🎉</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--teal-dim)" }}>
                      {pendingMint.length} certificate{pendingMint.length > 1 ? "s" : ""} ready to mint!
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
                      Your attendance was verified — mint your on-chain certificate now.
                    </div>
                  </div>
                </div>
                <button onClick={() => setTab("claims")} className="btn-primary" style={{ fontSize: 13, padding: "8px 18px" }}>
                  Mint now →
                </button>
              </div>
            )}

            {/* Recent claims */}
            <div className="card" style={{ padding: "22px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.01em" }}>Recent claims</h3>
                <button onClick={() => setTab("claims")} style={{ fontSize: 12, color: "var(--teal)", background: "none", border: "none", cursor: "pointer" }}>
                  See all →
                </button>
              </div>
              {attLoading && <div className="skeleton" style={{ height: 60, borderRadius: 8 }} />}
              {!attLoading && attendances.length === 0 && (
                <div style={{ textAlign: "center", padding: "24px 0" }}>
                  <p style={{ fontSize: 13, color: "var(--ink-4)", marginBottom: 12 }}>No claims yet.</p>
                  <Link href="/events" className="btn-secondary" style={{ fontSize: 12 }}>Find an event</Link>
                </div>
              )}
              {!attLoading && attendances.slice(0, 3).map(att => {
                return (
                  <div key={Number(att.attendance_id)} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 0", borderBottom: "1px solid var(--ink-7)", gap: 12,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "var(--teal)" }}>
                          Event #{String(att.event_id).padStart(4,"0")}
                        </span>
                        <div style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                          background: att.verdict === "valid" ? "#D1FAE5" : att.verdict === "insufficient" ? "#FEF3C7" : "#FEE2E2",
                          color: att.verdict === "valid" ? "#065F46" : att.verdict === "insufficient" ? "#92400E" : "#991B1B",
                        }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
                            background: att.verdict === "valid" ? "#10B981" : att.verdict === "insufficient" ? "#F59E0B" : "#EF4444"
                          }} />
                          {att.verdict === "valid" ? "Verified" : att.verdict === "insufficient" ? "Insufficient" : "Not verified"}
                        </div>
                        {att.cert_minted && (
                          <span style={{ fontSize: 10, fontWeight: 600, color: "#6366F1", background: "#EEF2FF", padding: "1px 7px", borderRadius: 20 }}>
                            certified
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--ink-4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {att.proof_url}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recent events */}
            {events.length > 0 && (
              <div className="card" style={{ padding: "22px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.01em" }}>Events you hosted</h3>
                  <button onClick={() => setTab("events")} style={{ fontSize: 12, color: "var(--teal)", background: "none", border: "none", cursor: "pointer" }}>
                    See all →
                  </button>
                </div>
                {events.slice(0, 3).map(ev => (
                  <div key={Number(ev.event_id)} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 0", borderBottom: "1px solid var(--ink-7)", gap: 12,
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{ev.name}</div>
                      <div style={{ fontSize: 11, color: "var(--ink-4)" }}>
                        {formatDate(ev.event_date)} · {ev.location} · {ev.attendee_count}/{ev.max_attendees} attendees
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      {ev.is_closed
                        ? <span style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-4)", background: "var(--ink-7)", padding: "2px 8px", borderRadius: 20 }}>closed</span>
                        : <span style={{ fontSize: 10, fontWeight: 600, color: "var(--teal)", background: "var(--teal-bg)", padding: "2px 8px", borderRadius: 20 }}>active</span>
                      }
                      <Link href={`/event/${ev.event_id}`} style={{ fontSize: 12, color: "var(--ink-4)", textDecoration: "none" }}>→</Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Events tab ── */}
        {tab === "events" && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
              <Link href="/create-event" className="btn-primary" style={{ fontSize: 13 }}>+ Host new event</Link>
            </div>
            {evLoading && <div className="skeleton" style={{ height: 120, borderRadius: 12 }} />}
            {!evLoading && events.length === 0 && (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <p style={{ fontSize: 14, color: "var(--ink-4)", marginBottom: 16 }}>You haven't hosted any events yet.</p>
                <Link href="/create-event" className="btn-primary">Host your first event</Link>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {events.map(ev => (
                <div key={Number(ev.event_id)} className="card" style={{ padding: "20px 22px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "var(--teal)" }}>
                          #{String(ev.event_id).padStart(4,"0")}
                        </span>
                        {ev.is_closed
                          ? <span style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-4)", background: "var(--ink-7)", padding: "2px 8px", borderRadius: 20 }}>closed</span>
                          : <span style={{ fontSize: 10, fontWeight: 600, color: "#10B981", background: "#D1FAE5", padding: "2px 8px", borderRadius: 20 }}>active</span>
                        }
                      </div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{ev.name}</h3>
                      <div style={{ fontSize: 12, color: "var(--ink-4)" }}>
                        {formatDate(ev.event_date)} · {ev.location}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "var(--teal)", letterSpacing: "-.02em" }}>
                          {ev.attendee_count}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--ink-4)" }}>of {ev.max_attendees}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <Link href={`/event/${ev.event_id}`} className="btn-secondary" style={{ fontSize: 12, padding: "6px 14px" }}>
                          View
                        </Link>
                        {!ev.is_closed && (
                          <button
                            onClick={() => closeEvent(Number(ev.event_id))}
                            disabled={closingId === Number(ev.event_id)}
                            style={{ fontSize: 12, padding: "6px 14px", borderRadius: 8, border: "1px solid #FECACA", background: "#FEF2F2", color: "#991B1B", cursor: "pointer" }}
                          >
                            {closingId === Number(ev.event_id) ? "..." : "Close"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Claims tab ── */}
        {tab === "claims" && (
          <div>
            <div style={{ marginBottom: 16, fontSize: 13, color: "var(--ink-3)" }}>
              {attendances.length} total claims · {validClaims.length} verified · {pendingMint.length} ready to mint
            </div>
            {attLoading && <div className="skeleton" style={{ height: 120, borderRadius: 12 }} />}
            {!attLoading && attendances.length === 0 && (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <p style={{ fontSize: 14, color: "var(--ink-4)", marginBottom: 16 }}>No attendance claims yet.</p>
                <Link href="/events" className="btn-primary">Find an event to attend</Link>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {attendances.map(att => {
                return (
                  <div key={Number(att.attendance_id)} className="card" style={{ padding: "20px 22px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "var(--teal)" }}>
                            Claim #{String(att.attendance_id).padStart(4,"0")}
                          </span>
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "var(--ink-4)" }}>
                            Event #{String(att.event_id).padStart(4,"0")}
                          </span>
                          <div style={{
                            display: "inline-flex", alignItems: "center", gap: 5,
                            fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                            background: att.verdict === "valid" ? "#D1FAE5" : att.verdict === "insufficient" ? "#FEF3C7" : "#FEE2E2",
                            color: att.verdict === "valid" ? "#065F46" : att.verdict === "insufficient" ? "#92400E" : "#991B1B",
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                              background: att.verdict === "valid" ? "#10B981" : att.verdict === "insufficient" ? "#F59E0B" : "#EF4444"
                            }} />
                            {att.verdict === "valid" ? "Attendance verified" : att.verdict === "insufficient" ? "Proof insufficient" : "Not verified"}
                          </div>
                          {att.is_revoked && (
                            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-4)", background: "var(--ink-7)", padding: "2px 9px", borderRadius: 20 }}>
                              revoked
                            </span>
                          )}
                          {att.cert_minted && (
                            <span style={{ fontSize: 11, fontWeight: 600, color: "#6366F1", background: "#EEF2FF", padding: "2px 9px", borderRadius: 20 }}>
                              ✓ certified
                            </span>
                          )}
                        </div>

                        <a href={att.proof_url} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: 12, color: "var(--ink-3)", display: "block", marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {att.proof_url}
                        </a>

                        {att.reason && (
                          <div style={{ fontSize: 12, color: "var(--ink-4)", fontStyle: "italic", background: "var(--ink-8)", padding: "8px 12px", borderRadius: 8 }}>
                            "{att.reason}"
                          </div>
                        )}
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10, flexShrink: 0 }}>
                        {att.verdict === "valid" && !att.cert_minted && !att.is_revoked && (
                          <button
                            onClick={() => mintCertificate(Number(att.attendance_id))}
                            disabled={mintingId === Number(att.attendance_id)}
                            className="btn-primary"
                            style={{ fontSize: 12, padding: "7px 16px" }}
                          >
                            {mintingId === Number(att.attendance_id) ? "Minting..." : "Mint certificate"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Certificates tab ── */}
        {tab === "certificates" && (
          <div>
            <div style={{ marginBottom: 16, fontSize: 13, color: "var(--ink-3)" }}>
              {certs.length} certificate{certs.length !== 1 ? "s" : ""} earned
            </div>
            {certLoading && <div className="skeleton" style={{ height: 120, borderRadius: 12 }} />}
            {!certLoading && certs.length === 0 && (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <p style={{ fontSize: 14, color: "var(--ink-4)", marginBottom: 8 }}>No certificates yet.</p>
                <p style={{ fontSize: 13, color: "var(--ink-4)", marginBottom: 20 }}>
                  Attend an event, submit proof, and mint your certificate.
                </p>
                <Link href="/events" className="btn-primary">Find an event</Link>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: 14 }}>
              {certs.map(cert => (
                <div key={Number(cert.token_id)} className="card" style={{ padding: "22px 24px", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, var(--teal), #6366F1)" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-4)" }}>
                      Certificate
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#6366F1", background: "#EEF2FF", padding: "2px 8px", borderRadius: 20 }}>
                      on-chain
                    </span>
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 28, fontWeight: 700, color: "#6366F1", letterSpacing: "-.02em", marginBottom: 6 }}>
                    #{String(cert.token_id).padStart(4,"0")}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, lineHeight: 1.3 }}>{cert.event_name}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[
                      { label: "Date",      value: formatDate(cert.event_date), teal: false },
                      { label: "Location",  value: cert.event_location,         teal: false },
                      { label: "AI Score",  value: `${cert.confidence}%`,       teal: true  },
                      { label: "Status",    value: "active",                    teal: true  },
                    ].map(r => (
                      <div key={r.label} style={{ background: r.teal ? "var(--teal-bg)" : "var(--ink-8)", borderRadius: 8, padding: "9px 11px" }}>
                        <div style={{ fontSize: 10, color: "var(--ink-4)", fontWeight: 600, marginBottom: 3 }}>{r.label}</div>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 600, color: r.teal ? "var(--teal)" : "var(--ink-2)" }}>
                          {r.value}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link href={`/certificate/${cert.token_id}`} style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginTop: 16, fontSize: 12, color: "var(--ink-4)", textDecoration: "none",
                    padding: "8px 0", borderTop: "1px solid var(--ink-6)",
                    transition: "color .15s",
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--teal)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--ink-4)"}>
                    View & share →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

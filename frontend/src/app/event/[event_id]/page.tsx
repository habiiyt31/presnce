"use client";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { useEvent, useEventAttendances } from "@/hooks/useContract";
import { formatDate } from "@/lib/utils";
import { useDisplayName } from "@/hooks/useNickname";

function AttendeeName({ address }: { address: string }) {
  const name = useDisplayName(address);
  return <>{name}</>;
}

export default function EventDetailPage({ params }: { params: { event_id: string } }) {
  const { event_id } = params;
  const { event, loading: evLoading } = useEvent(event_id);
  const { attendances, loading: attLoading } = useEventAttendances(event ? Number(event.event_id) : null);

  const verified     = attendances.filter(a => a.verdict === "valid");
  const insufficient = attendances.filter(a => a.verdict === "insufficient");
  const invalid      = attendances.filter(a => a.verdict === "invalid");
  const spotsLeft    = event ? event.max_attendees - event.attendee_count : 0;
  const fillPct      = event ? Math.min(100, (event.attendee_count / event.max_attendees) * 100) : 0;

  const verdictLabel = (v: string) =>
    v === "valid" ? "Attendance verified" : v === "insufficient" ? "Proof insufficient" : "Not verified";
  const verdictColor = (v: string) =>
    v === "valid" ? "var(--verify-green)" : v === "insufficient" ? "var(--verify-amber)" : "var(--verify-red)";
  const verdictBg = (v: string) =>
    v === "valid" ? "rgba(16,185,129,.08)" : v === "insufficient" ? "rgba(245,158,11,.08)" : "rgba(239,68,68,.08)";

  if (evLoading) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
        <Navbar />
        <main style={{ flex: 1, maxWidth: 1100, margin: "0 auto", width: "100%", padding: "clamp(28px,4vw,48px) clamp(16px,4vw,24px)" }}>
          <div className="skeleton" style={{ height: 16, width: 120, marginBottom: 24 }} />
          <div className="skeleton" style={{ height: 36, width: "60%", marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 200, marginTop: 24 }} />
        </main>
      </div>
    );
  }

  if (!event) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
        <Navbar />
        <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Event not found</h2>
            <Link href="/events" className="btn-secondary" style={{ fontSize: 13 }}>Back to events</Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <main style={{ flex: 1, maxWidth: 1100, margin: "0 auto", width: "100%", padding: "clamp(28px,4vw,48px) clamp(16px,4vw,24px)" }}>

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-4)", marginBottom: 28 }}>
          <Link href="/events" style={{ color: "var(--teal)", textDecoration: "none" }}>Events</Link>
          <span>/</span>
          <span>#{String(event.event_id).padStart(4,"0")}</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: 24 }}>

          {/* Left */}
          <div style={{ minWidth: 0 }}>

            {/* Cover image */}
            {event.image_url && (
              <div style={{ borderRadius: 14, overflow: "hidden", marginBottom: 20, border: "1px solid var(--ink-6)", background: "#000" }}>
                <img src={event.image_url} alt={event.name}
                  style={{ width: "100%", height: "auto", display: "block", maxHeight: 400 }} />
              </div>
            )}

            {/* Header */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "var(--teal)" }}>
                  #{String(event.event_id).padStart(4,"0")}
                </span>
                {event.is_closed && <span className="badge badge-closed">closed</span>}
                {!event.is_closed && spotsLeft === 0 && <span className="badge badge-invalid">full</span>}
              </div>
              <h1 style={{ fontSize: "clamp(22px,3vw,30px)", fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.2, marginBottom: 10, overflowWrap: "anywhere" }}>
                {event.name}
              </h1>
              <p style={{ fontSize: 14, color: "var(--ink-3)", lineHeight: 1.7, overflowWrap: "anywhere" }}>{event.description}</p>
            </div>

            {/* Claim CTA */}
            {!event.is_closed && spotsLeft > 0 && (
              <Link href={`/claim?event_id=${event.event_id}`} className="btn-primary" style={{ fontSize: 14, marginBottom: 28, display: "inline-flex" }}>
                Claim attendance →
              </Link>
            )}

            {/* Attendance gallery */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-.01em" }}>Attendance records</h2>
                <span style={{ fontSize: 12, color: "var(--ink-4)" }}>{attendances.length} total</span>
              </div>

              {attLoading && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[1,2].map(i => <div key={i} className="skeleton" style={{ height: 80 }} />)}
                </div>
              )}

              {!attLoading && attendances.length === 0 && (
                <div style={{ textAlign: "center", padding: "32px 0", border: "2px dashed var(--ink-6)", borderRadius: 12 }}>
                  <p style={{ fontSize: 13, color: "var(--ink-4)" }}>No attendance claims yet.</p>
                  {!event.is_closed && (
                    <Link href={`/claim?event_id=${event.event_id}`} style={{ fontSize: 12, color: "var(--teal)", marginTop: 8, display: "block" }}>
                      Be the first to claim →
                    </Link>
                  )}
                </div>
              )}

              {!attLoading && attendances.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[...verified, ...insufficient, ...invalid].map(att => (
                    <div key={Number(att.attendance_id)} className="card" style={{
                      padding: "14px 18px",
                      borderLeft: `3px solid ${verdictColor(att.verdict)}`,
                    }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "var(--ink-4)" }}>
                              #{String(att.attendance_id).padStart(4,"0")}
                            </span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-2)" }}>
                              <AttendeeName address={att.attendee} />
                            </span>
                            {att.cert_minted && (
                              <Link href={`/certificate/${att.attendance_id}`} style={{
                                fontSize: 10, fontWeight: 600, color: "#6366F1",
                                background: "#EEF2FF", padding: "1px 7px", borderRadius: 20, textDecoration: "none",
                              }}>✓ cert →</Link>
                            )}
                          </div>

                          {/* Verdict — clear, no % */}
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                            <span style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: verdictColor(att.verdict) }} />
                            <span style={{ fontSize: 13, fontWeight: 700, color: verdictColor(att.verdict) }}>
                              {verdictLabel(att.verdict)}
                            </span>
                          </div>

                          <a href={att.proof_url} target="_blank" rel="noopener noreferrer" style={{
                            fontSize: 11, color: "var(--ink-4)", display: "block",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            maxWidth: "100%", marginBottom: att.reason ? 6 : 0,
                          }}>{att.proof_url}</a>

                          {att.reason && (
                            <div style={{ fontSize: 11, color: "var(--ink-4)", fontStyle: "italic",
                              background: verdictBg(att.verdict), borderRadius: 6, padding: "6px 10px", lineHeight: 1.5 }}>
                              "{att.reason}"
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Details */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Capacity */}
            <div className="card" style={{ padding: "20px 22px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-4)", marginBottom: 10 }}>
                Capacity
              </div>
              <div style={{ fontSize: 36, fontWeight: 800, color: "var(--teal)", letterSpacing: "-.03em", lineHeight: 1, marginBottom: 10 }}>
                {event.attendee_count}
                <span style={{ fontSize: 18, color: "var(--ink-4)", fontWeight: 400 }}>/{event.max_attendees}</span>
              </div>
              <div className="conf-track" style={{ marginBottom: 6 }}>
                <div className="conf-fill" style={{ width: `${fillPct}%` }} />
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-4)" }}>
                {spotsLeft > 0 ? `${spotsLeft} spots remaining` : "Event is full"}
              </div>
            </div>

            {/* Details */}
            <div className="card" style={{ padding: "20px 22px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-4)", marginBottom: 14 }}>
                Details
              </div>

              {/* Organizer */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ink-4)", marginBottom: 3 }}>Organizer</div>
                <div style={{ fontSize: 13, color: "var(--ink-2)", overflowWrap: "anywhere" }}>
                  <AttendeeName address={event.organizer} />
                </div>
              </div>

              {/* Date + Time */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ink-4)", marginBottom: 3 }}>Date & Time</div>
                <div style={{ fontSize: 13, color: "var(--ink-2)", fontFamily: "'JetBrains Mono',monospace" }}>
                  {formatDate(event.event_date)}{(event as any).event_time ? ` · ${(event as any).event_time}` : ""}
                </div>
              </div>

              {/* Location + Maps */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ink-4)", marginBottom: 6 }}>Location</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2)", marginBottom: 4, overflowWrap: "anywhere" }}>
                  {event.location}
                </div>
                <a href={`https://maps.google.com/?q=${encodeURIComponent(event.location)}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 11, color: "var(--teal)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 10 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                  Open in Maps
                </a>
                <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid var(--ink-6)" }}>
                  <iframe title="Event location map" width="100%" height="200"
                    style={{ display: "block", border: "none" }} loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(event.location)}&output=embed&z=15`}
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ink-4)", marginBottom: 3 }}>Status</div>
                <div style={{ fontSize: 13, fontFamily: "'JetBrains Mono',monospace", color: event.is_closed ? "var(--verify-red)" : "var(--verify-green)" }}>
                  {event.is_closed ? "Closed" : "Active"}
                </div>
              </div>
            </div>

            {!event.is_closed && spotsLeft > 0 && (
              <Link href={`/claim?event_id=${event.event_id}`} className="btn-primary" style={{ textAlign: "center", fontSize: 14 }}>
                Claim attendance
              </Link>
            )}

            <Link href="/events" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--ink-4)", textDecoration: "none" }}>
              ← Back to events
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

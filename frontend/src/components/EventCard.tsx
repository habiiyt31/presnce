"use client";
import Link from "next/link";
import { shortAddr, formatDate } from "@/lib/utils";
import type { EventRecord } from "@/types";

export function EventCard({ event, showActions = false }: { event: EventRecord; showActions?: boolean }) {
  const spotsLeft = event.max_attendees - event.attendee_count;
  const fillPct   = Math.min(100, (event.attendee_count / event.max_attendees) * 100);
  const isFull    = spotsLeft <= 0;

  return (
    <article className="card-hover" style={{ padding: 22, display: "flex", flexDirection: "column" }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <Link href={`/event/${event.event_id}`} style={{
          fontFamily: "'JetBrains Mono',monospace",
          fontSize: 11, fontWeight: 500, color: "var(--teal)", textDecoration: "none",
        }}>
          #{String(event.event_id).padStart(4, "0")}
        </Link>
        <div style={{ display: "flex", gap: 5 }}>
          {event.is_verified_org && <span className="badge badge-verified">✓ verified</span>}
          {event.is_closed        && <span className="badge badge-closed">closed</span>}
          {isFull && !event.is_closed && <span className="badge badge-invalid">full</span>}
        </div>
      </div>

      <Link href={`/event/${event.event_id}`} style={{ textDecoration: "none" }}>
        <h3 style={{
          fontSize: 15, fontWeight: 700, color: "var(--ink)",
          letterSpacing: "-.02em", lineHeight: 1.4, marginBottom: 6,
          display: "-webkit-box", WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {event.name}
        </h3>
      </Link>

      <p style={{
        fontSize: 13, color: "var(--ink-3)", lineHeight: 1.6, marginBottom: 18,
        display: "-webkit-box", WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical", overflow: "hidden",
      }}>
        {event.description}
      </p>

      <div style={{ height: 1, background: "var(--ink-6)", marginBottom: 16 }} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px", marginBottom: 16 }}>
        {[
          { label: "Date",      value: formatDate(event.event_date), mono: true },
          { label: "Location",  value: event.location },
        ].map(r => (
          <div key={r.label}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" as const, color: "var(--ink-4)", marginBottom: 3 }}>
              {r.label}
            </div>
            <div style={{
              fontSize: 12, color: "var(--ink-2)",
              fontFamily: r.mono ? "'JetBrains Mono',monospace" : "inherit",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const,
            }}>
              {r.value}
            </div>
          </div>
        ))}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" as const, color: "var(--ink-4)", marginBottom: 5 }}>
            Capacity
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div className="conf-track" style={{ flex: 1, height: 4 }}>
              <div className="conf-fill" style={{ width: `${fillPct}%` }} />
            </div>
            <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: "var(--teal)", fontWeight: 600 }}>
              {event.attendee_count}/{event.max_attendees}
            </span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" as const, color: "var(--ink-4)", marginBottom: 3 }}>
            Organizer
          </div>
          <Link href={`/organizer/${event.organizer}`} style={{
            fontSize: 12, fontFamily: "'JetBrains Mono',monospace",
            color: "var(--ink-2)", textDecoration: "none",
          }}>
            {shortAddr(event.organizer)}
          </Link>
        </div>
      </div>

      <div style={{ marginTop: "auto" }}>
        {showActions && !event.is_closed && !isFull && (
          <Link href={`/claim?event_id=${event.event_id}`} className="btn-primary" style={{
            width: "100%", marginBottom: 10, fontSize: 13, justifyContent: "center",
          }}>
            Claim attendance
          </Link>
        )}
        <Link href={`/event/${event.event_id}`} style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
          fontSize: 12, fontWeight: 500, color: "var(--ink-4)",
          textDecoration: "none", padding: "6px 0",
          transition: "color .15s",
        }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--teal)"}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--ink-4)"}>
          View details →
        </Link>
      </div>
    </article>
  );
}

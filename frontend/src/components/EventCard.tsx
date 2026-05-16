"use client";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { useDisplayName } from "@/hooks/useNickname";
import type { EventRecord } from "@/types";

export function EventCard({ event, showActions = false }: { event: EventRecord; showActions?: boolean }) {
  const organizerName = useDisplayName(event.organizer);
  const spotsLeft     = event.max_attendees - event.attendee_count;
  const fillPct       = Math.min(100, (event.attendee_count / event.max_attendees) * 100);
  const isFull        = spotsLeft <= 0;

  return (
    <article style={{
      background: "var(--surface)",
      border: "1px solid var(--ink-6)",
      borderRadius: 16,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      boxShadow: "var(--shadow)",
      transition: "box-shadow .2s, transform .15s",
      cursor: "pointer",
      height: "100%",
    }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(0,0,0,.1)";
      (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow)";
      (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
    }}>

      {/* Cover image — natural ratio, consistent look */}
      <Link href={`/event/${event.event_id}`} style={{ textDecoration: "none", display: "block" }}>
        <div style={{
          width: "100%",
          background: event.image_url ? "#000" : "linear-gradient(135deg, var(--teal-bg) 0%, #EEF2FF 100%)",
          overflow: "hidden",
          flexShrink: 0,
          position: "relative",
          minHeight: event.image_url ? 0 : 120,
        }}>
          {event.image_url ? (
            <img
              src={event.image_url}
              alt={event.name}
              style={{ width: "100%", height: "auto", display: "block", maxHeight: 280 }}
            />
          ) : (
            <div style={{
              width: "100%", height: "100%",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="40" height="40" viewBox="0 0 28 28" fill="none" opacity={0.2}>
                <path d="M14 4C8.48 4 4 8.48 4 14" stroke="#0D9488" strokeWidth="2" strokeLinecap="round"/>
                <path d="M14 7C10.13 7 7 10.13 7 14" stroke="#0D9488" strokeWidth="2" strokeLinecap="round"/>
                <path d="M14 10c-2.21 0-4 1.79-4 4 0 .9.3 1.74.8 2.42" stroke="#0D9488" strokeWidth="2" strokeLinecap="round"/>
                <path d="M14 10c2.21 0 4 1.79 4 4v2" stroke="#0D9488" strokeWidth="2" strokeLinecap="round"/>
                <path d="M10 14v4" stroke="#0D9488" strokeWidth="2" strokeLinecap="round"/>
                <path d="M18 16c0 2.2-1 4.2-2.5 5.5" stroke="#0D9488" strokeWidth="2" strokeLinecap="round"/>
                <path d="M10 18c.5 1.8 1.7 3.3 3.3 4.2" stroke="#0D9488" strokeWidth="2" strokeLinecap="round"/>
                <path d="M14 4c5.52 0 10 4.48 10 10 0 1.8-.48 3.5-1.32 4.97" stroke="#0D9488" strokeWidth="2" strokeLinecap="round"/>
                <path d="M21.5 20.5c-1.2 1.8-3 3.1-5.1 3.7" stroke="#0D9488" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
          )}
          {/* Badges overlay */}
          <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 5 }}>
            {event.is_closed        && <span className="badge badge-closed">closed</span>}
            {isFull && !event.is_closed && <span className="badge badge-invalid">full</span>}
          </div>
        </div>
      </Link>

      {/* Content */}
      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", flex: 1 }}>

        {/* Event ID */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <Link href={`/event/${event.event_id}`} style={{
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: 11, fontWeight: 500, color: "var(--teal)", textDecoration: "none",
          }}>
            #{String(event.event_id).padStart(4, "0")}
          </Link>
          <span style={{ fontSize: 11, color: "var(--ink-4)", fontFamily: "'JetBrains Mono',monospace" }}>
            {event.attendee_count}/{event.max_attendees}
          </span>
        </div>

        {/* Title */}
        <Link href={`/event/${event.event_id}`} style={{ textDecoration: "none" }}>
          <h3 style={{
            fontSize: 15, fontWeight: 700, color: "var(--ink)",
            letterSpacing: "-.01em", lineHeight: 1.35,
            marginBottom: 6,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}>
            {event.name}
          </h3>
        </Link>

        {/* Date + Location */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: "var(--ink-3)", display: "flex", alignItems: "center", gap: 5 }}>
            <span>📅</span>
            <span style={{ fontFamily: "'JetBrains Mono',monospace" }}>{formatDate(event.event_date)}{(event as any).event_time ? ` · ${(event as any).event_time}` : ""}</span>
          </div>
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(event.location)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ fontSize: 12, color: "var(--teal)", display: "flex", alignItems: "flex-start", gap: 5, textDecoration: "none",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >
            <span style={{ flexShrink: 0 }}>📍</span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{event.location}</span>
          </a>
        </div>

        {/* Capacity bar */}
        <div className="conf-track" style={{ marginBottom: 10 }}>
          <div className="conf-fill" style={{ width: `${fillPct}%` }} />
        </div>

        {/* Organizer */}
        <div style={{ fontSize: 11, color: "var(--ink-4)", marginBottom: 14 }}>
          by{" "}
          <Link href={`/organizer/${event.organizer}`} style={{ color: "var(--ink-3)", textDecoration: "none", fontWeight: 500 }}>
            {organizerName}
          </Link>
        </div>

        {/* Actions */}
        <div style={{ marginTop: "auto" }}>
          {showActions && !event.is_closed && !isFull ? (
            <Link href={`/claim?event_id=${event.event_id}`} className="btn-primary" style={{
              width: "100%", fontSize: 13, justifyContent: "center", marginBottom: 8,
            }}>
              Claim attendance
            </Link>
          ) : null}
          <Link href={`/event/${event.event_id}`} style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, color: "var(--ink-4)", textDecoration: "none", padding: "4px 0",
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--teal)"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--ink-4)"}>
            View details →
          </Link>
        </div>
      </div>
    </article>
  );
}

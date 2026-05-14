"use client";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { useEvent, useEventAttendances } from "@/hooks/useContract";
import { shortAddr, formatDate } from "@/lib/utils";

const VERDICT_STYLE: Record<string, string> = {
  valid:        "badge-valid",
  invalid:      "badge-invalid",
  insufficient: "badge-insufficient",
};

export default function EventDetailPage({ params }: { params: { event_id: string } }) {
  const { event_id } = params;
  const { event,      loading: evLoading  } = useEvent(event_id);
  const { attendances, loading: attLoading } = useEventAttendances(
    event ? Number(event.event_id) : null
  );

  const spotsLeft = event ? event.max_attendees - event.attendee_count : 0;
  const fillPct   = event ? Math.min(100, (event.attendee_count / event.max_attendees) * 100) : 0;

  if (evLoading) {
    return (
      <div className="min-h-dvh flex flex-col">
        <Navbar />
        <main className="flex-1 px-4 sm:px-6 py-10 max-w-4xl mx-auto w-full space-y-4">
          <div className="skeleton h-4 w-24" />
          <div className="skeleton h-8 w-2/3" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-40 w-full mt-6" />
        </main>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-dvh flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <p className="font-mono text-4xl text-ink-600 mb-4">#{event_id.padStart(4,"0")}</p>
            <h2 className="font-display text-xl text-ink-100 mb-2">Event not found</h2>
            <p className="text-sm text-ink-400 mb-6">This event ID doesn't exist yet.</p>
            <Link href="/events" className="btn-secondary">Browse events</Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <Navbar />
      <main className="flex-1 px-4 sm:px-6 py-10 max-w-4xl mx-auto w-full">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-mono text-ink-500 mb-8 animate-fade-up">
          <Link href="/events" className="hover:text-violet-light transition-colors">Events</Link>
          <span>/</span>
          <span className="text-ink-300">#{String(event.event_id).padStart(4,"0")}</span>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">

          {/* Left: Main info */}
          <div className="lg:col-span-2 space-y-5 animate-fade-up">
            {/* Header */}
            <div>
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <span className="font-mono text-xs text-violet/60">
                  #{String(event.event_id).padStart(4,"0")}
                </span>
                {event.is_verified_org && <span className="badge-verified">verified organizer</span>}
                {event.is_closed        && <span className="badge-closed">closed</span>}
                {!event.is_closed && spotsLeft === 0 && <span className="badge-invalid">full</span>}
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink-50 leading-snug mb-3">
                {event.name}
              </h1>
              <p className="text-sm text-ink-300 leading-relaxed">{event.description}</p>
            </div>

            {/* Attendance list */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-mono uppercase tracking-wider text-ink-400">
                  Attendance records
                  {attendances.length > 0 && (
                    <span className="ml-2 text-ink-500">({attendances.length})</span>
                  )}
                </p>
                {!event.is_closed && spotsLeft > 0 && (
                  <Link href={`/claim?event_id=${event.event_id}`}
                    className="text-xs font-mono text-violet-light hover:underline">
                    + Claim attendance
                  </Link>
                )}
              </div>

              {attLoading && (
                <div className="space-y-2">
                  {[1,2].map(i => <div key={i} className="skeleton h-16 w-full" />)}
                </div>
              )}

              {!attLoading && attendances.length === 0 && (
                <div className="border border-dashed border-ink-700 p-6 text-center">
                  <p className="text-xs text-ink-500">No verified attendances yet.</p>
                </div>
              )}

              {!attLoading && attendances.length > 0 && (
                <div className="space-y-3">
                  {attendances.filter(a => a.verdict === "valid").map(att => (
                    <div key={Number(att.attendance_id)} className="card p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <p className="text-[10px] font-mono text-ink-500 mb-1">
                            #{String(att.attendance_id).padStart(4,"0")} · {shortAddr(att.attendee)}
                          </p>
                          <a href={att.proof_url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-ink-300 hover:text-violet-light transition-colors truncate block line-clamp-1">
                            {att.proof_url}
                          </a>
                        </div>
                        <span className={VERDICT_STYLE[att.verdict] ?? "badge-invalid"}>
                          {att.verdict}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-20 h-0.5 bg-ink-700">
                          <div className="h-full bg-violet/60" style={{ width: `${att.confidence}%` }} />
                        </div>
                        <span className="text-[10px] font-mono text-ink-500">{att.confidence}%</span>
                      </div>
                      {att.reason && (
                        <p className="mt-2 text-xs text-ink-400 italic line-clamp-2">"{att.reason}"</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Stats + Actions */}
          <div className="space-y-4 animate-fade-up delay-100">

            {/* Capacity */}
            <div className="card p-5">
              <p className="text-[10px] font-mono uppercase tracking-wider text-ink-500 mb-3">Capacity</p>
              <p className="font-display text-5xl font-bold text-violet-light leading-none mb-3">
                {event.attendee_count}
                <span className="text-xl text-ink-500 font-normal">/{event.max_attendees}</span>
              </p>
              <div className="h-1.5 bg-ink-700 overflow-hidden mb-1">
                <div className="h-full bg-gradient-to-r from-violet to-violet-light"
                  style={{ width: `${fillPct}%` }} />
              </div>
              <p className="text-[10px] font-mono text-ink-500">
                {spotsLeft > 0 ? `${spotsLeft} spots remaining` : "Event is full"}
              </p>
            </div>

            {/* Details */}
            <div className="card p-5 space-y-4">
              <p className="text-[10px] font-mono uppercase tracking-wider text-ink-500">Details</p>
              {[
                { label: "Organizer", value: shortAddr(event.organizer), mono: true },
                { label: "Date",      value: formatDate(event.event_date), mono: true },
                { label: "Location",  value: event.location },
                { label: "Status",    value: event.is_closed ? "closed" : "active", mono: true,
                  accent: event.is_closed ? "text-rust" : "text-sage-light" },
              ].map(row => (
                <div key={row.label}>
                  <p className="text-[10px] text-ink-500 mb-0.5">{row.label}</p>
                  <p className={`text-xs ${row.mono ? "font-mono" : ""} ${row.accent ?? "text-ink-200"}`}>
                    {row.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Actions */}
            {!event.is_closed && spotsLeft > 0 && (
              <Link href={`/claim?event_id=${event.event_id}`}
                className="btn-primary w-full text-center text-sm py-3">
                Claim attendance
              </Link>
            )}

            <Link href="/events"
              className="flex items-center gap-1 text-xs font-mono text-ink-500 hover:text-violet-light transition-colors">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to events
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

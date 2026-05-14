"use client";
import { useState, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { EventCard } from "@/components/EventCard";
import { useAllEvents } from "@/hooks/useContract";
import type { EventRecord } from "@/types";

type SortKey = "newest" | "oldest" | "spots";

export default function EventsPage() {
  const { events, loading, error, refetch } = useAllEvents();
  const [query,      setQuery]    = useState("");
  const [sort,       setSort]     = useState<SortKey>("newest");
  const [showClosed, setShowC]    = useState(false);
  const [verifiedOnly, setVerified] = useState(false);

  const filtered = useMemo(() => {
    let xs: EventRecord[] = [...events];
    if (!showClosed)   xs = xs.filter(e => !e.is_closed);
    if (verifiedOnly)  xs = xs.filter(e => e.is_verified_org);
    if (query.trim()) {
      const q = query.toLowerCase();
      xs = xs.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        String(e.event_id).includes(q)
      );
    }
    xs.sort((a, b) => {
      switch (sort) {
        case "newest": return Number(b.event_id) - Number(a.event_id);
        case "oldest": return Number(a.event_id) - Number(b.event_id);
        case "spots":  return (b.max_attendees - b.attendee_count) - (a.max_attendees - a.attendee_count);
      }
    });
    return xs;
  }, [events, query, sort, showClosed, verifiedOnly]);

  return (
    <div className="min-h-dvh flex flex-col">
      <Navbar />
      <main className="flex-1 px-4 sm:px-6 py-10 max-w-6xl mx-auto w-full">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8 animate-fade-up">
          <div>
            <p className="section-label mb-2">Public registry</p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink-50">Explore events</h1>
            <p className="text-sm text-ink-400 mt-2">AI-verified events on GenLayer. Claim your attendance.</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-2xl font-medium text-violet-light">{events.length}</p>
            <p className="text-xs text-ink-400">total events</p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-3 animate-fade-up delay-100">
          <div className="flex flex-col sm:flex-row gap-3">
            <input type="text" className="input-field flex-1"
              placeholder="Search by name, location, or event ID..."
              value={query} onChange={e => setQuery(e.target.value)} />
            <select className="input-field sm:w-40" value={sort} onChange={e => setSort(e.target.value as SortKey)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="spots">Most spots</option>
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-ink-400 cursor-pointer select-none">
              <input type="checkbox" checked={verifiedOnly} onChange={e => setVerified(e.target.checked)}
                className="w-3.5 h-3.5 accent-violet" />
              Verified organizers only
            </label>
            <label className="flex items-center gap-2 text-xs text-ink-400 cursor-pointer select-none">
              <input type="checkbox" checked={showClosed} onChange={e => setShowC(e.target.checked)}
                className="w-3.5 h-3.5 accent-violet" />
              Show closed events
            </label>
            <div className="flex-1" />
            <button onClick={refetch} className="text-xs font-mono text-ink-400 hover:text-violet-light transition-colors px-2 py-1">
              ↻ refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="border border-rust/30 bg-rust/5 text-rust p-4 rounded-sm text-sm mb-6">
            Failed to load events: {error}
          </div>
        )}

        {loading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="card p-5 space-y-3">
                <div className="skeleton h-3 w-12" />
                <div className="skeleton h-5 w-3/4" />
                <div className="skeleton h-3 w-full" />
                <div className="skeleton h-3 w-2/3" />
                <div className="skeleton h-px w-full my-2" />
                <div className="skeleton h-8 w-full" />
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-up delay-200">
            {filtered.map(event => (
              <EventCard key={Number(event.event_id)} event={event} showActions />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && events.length > 0 && (
          <div className="text-center py-20">
            <p className="text-sm text-ink-400">No events match your filters.</p>
            <button onClick={() => { setQuery(""); setShowC(false); setVerified(false); }}
              className="mt-3 text-xs font-mono text-violet-light hover:underline">
              clear filters
            </button>
          </div>
        )}

        {!loading && events.length === 0 && !error && (
          <div className="text-center py-20">
            <div className="w-16 h-16 border border-dashed border-ink-600 flex items-center justify-center mx-auto mb-6">
              <div className="w-5 h-5 border border-ink-500" />
            </div>
            <h3 className="font-display text-lg text-ink-100 mb-2">No events yet</h3>
            <p className="text-sm text-ink-400 mb-6">Be the first to host an event.</p>
            <a href="/create-event" className="btn-primary">Host an event</a>
          </div>
        )}
      </main>
    </div>
  );
}

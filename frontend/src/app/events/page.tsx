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

  const filtered = useMemo(() => {
    let xs: EventRecord[] = [...events];
    if (!showClosed) xs = xs.filter(e => !e.is_closed);
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
  }, [events, query, sort, showClosed]);

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <main style={{ flex: 1, maxWidth: 1100, margin: "0 auto", width: "100%", padding: "clamp(28px,4vw,48px) clamp(16px,4vw,24px)" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
          <div>
            <p className="section-label" style={{ marginBottom: 8 }}>Public registry</p>
            <h1 style={{ fontSize: "clamp(24px,4vw,36px)", fontWeight: 800, letterSpacing: "-.03em" }}>Explore events</h1>
            <p style={{ fontSize: 14, color: "var(--ink-3)", marginTop: 6 }}>AI-verified events on GenLayer. Claim your attendance.</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--teal)", letterSpacing: "-.03em" }}>{events.length}</div>
            <div style={{ fontSize: 12, color: "var(--ink-4)" }}>total events</div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ marginBottom: 24, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <input type="text" className="input-field" style={{ flex: 1, minWidth: 200 }}
              placeholder="Search by name, location, or event ID..."
              value={query} onChange={e => setQuery(e.target.value)} />
            <select className="input-field" style={{ width: 160 }}
              value={sort} onChange={e => setSort(e.target.value as SortKey)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="spots">Most spots</option>
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "var(--ink-3)", cursor: "pointer" }}>
              <input type="checkbox" checked={showClosed} onChange={e => setShowC(e.target.checked)}
                style={{ width: 14, height: 14, accentColor: "var(--teal)", cursor: "pointer" }} />
              Show closed events
            </label>
            <div style={{ flex: 1 }} />
            <button onClick={refetch} style={{
              fontSize: 12, color: "var(--ink-4)", background: "none", border: "none",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
            }}>
              ↻ refresh
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "14px 16px", fontSize: 13, color: "#991B1B", marginBottom: 20 }}>
            Failed to load events: {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: 16 }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="card" style={{ padding: 22 }}>
                <div className="skeleton" style={{ height: 12, width: 60, marginBottom: 14 }} />
                <div className="skeleton" style={{ height: 20, width: "80%", marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 12, width: "100%", marginBottom: 6 }} />
                <div className="skeleton" style={{ height: 12, width: "60%", marginBottom: 20 }} />
                <div className="skeleton" style={{ height: 1, marginBottom: 16 }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div className="skeleton" style={{ height: 32 }} />
                  <div className="skeleton" style={{ height: 32 }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Events grid */}
        {!loading && filtered.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: 16, alignItems: "start" }}>
            {filtered.map(event => (
              <EventCard key={Number(event.event_id)} event={event} showActions />
            ))}
          </div>
        )}

        {/* No results */}
        {!loading && filtered.length === 0 && events.length > 0 && (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <p style={{ fontSize: 14, color: "var(--ink-4)", marginBottom: 12 }}>No events match your filters.</p>
            <button onClick={() => { setQuery(""); setShowC(false); }}
              style={{ fontSize: 13, color: "var(--teal)", background: "none", border: "none", cursor: "pointer" }}>
              Clear filters
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && events.length === 0 && !error && (
          <div style={{ textAlign: "center", padding: "64px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No events yet</h3>
            <p style={{ fontSize: 14, color: "var(--ink-4)", marginBottom: 24 }}>Be the first to host an event on Presnce.</p>
            <a href="/create-event" className="btn-primary">Host an event</a>
          </div>
        )}
      </main>
    </div>
  );
}

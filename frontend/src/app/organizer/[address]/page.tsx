"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { EventCard } from "@/components/EventCard";
import { getReadClient, CONTRACT_ADDRESS } from "@/lib/genlayer";
import { useDisplayName } from "@/hooks/useNickname";
import type { EventRecord } from "@/types";

export default function OrganizerPage({ params }: { params: { address: string } }) {
  const { address } = params;
  const displayName = useDisplayName(address);
  const [events,  setEvents]  = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!CONTRACT_ADDRESS) { setLoading(false); return; }
      try {
        const client = getReadClient();
        const ids = await client.readContract({
          address:      CONTRACT_ADDRESS as `0x${string}`,
          functionName: "get_organizer_events",
          args:         [address] as any,
        }) as Array<number | bigint | string>;
        if (ids && ids.length > 0) {
          const records = await Promise.all(
            ids.map(async (id) => {
              try {
                const r = await client.readContract({
                  address:      CONTRACT_ADDRESS as `0x${string}`,
                  functionName: "get_event",
                  args:         [Number(id)] as any,
                }) as any;
                return r && r.event_id !== undefined ? (r as EventRecord) : null;
              } catch { return null; }
            })
          );
          setEvents(records.filter(Boolean) as EventRecord[]);
        }
      } catch (e) {
        console.error("organizer:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [address]);

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <main style={{ flex: 1, maxWidth: 1100, margin: "0 auto", width: "100%", padding: "clamp(28px,4vw,48px) clamp(16px,4vw,24px)" }}>

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-4)", marginBottom: 28 }}>
          <Link href="/events" style={{ color: "var(--teal)", textDecoration: "none" }}>Events</Link>
          <span>/</span>
          <span>{displayName}</span>
        </div>

        {/* Header */}
        <div className="card" style={{ padding: "24px 28px", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div className="section-label" style={{ marginBottom: 6 }}>Organizer</div>
              <h1 style={{ fontSize: "clamp(20px,3vw,28px)", fontWeight: 800, letterSpacing: "-.02em", marginBottom: 4 }}>
                {displayName}
              </h1>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "var(--ink-4)" }}>
                {address}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: "var(--teal)", letterSpacing: "-.03em", lineHeight: 1 }}>
                {loading ? "—" : events.length}
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-4)", marginTop: 4 }}>events hosted</div>
            </div>
          </div>
        </div>

        {/* Events */}
        <div className="section-label" style={{ marginBottom: 16 }}>Events by this organizer</div>

        {loading && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: 16 }}>
            {[1,2,3].map(i => (
              <div key={i} className="card" style={{ padding: 22 }}>
                <div className="skeleton" style={{ height: 140, marginBottom: 14 }} />
                <div className="skeleton" style={{ height: 16, width: "70%", marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 12, width: "100%" }} />
              </div>
            ))}
          </div>
        )}

        {!loading && events.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <p style={{ fontSize: 14, color: "var(--ink-4)" }}>No events hosted yet.</p>
          </div>
        )}

        {!loading && events.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: 16 }}>
            {[...events].reverse().map(ev => (
              <EventCard key={Number(ev.event_id)} event={ev} showActions />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
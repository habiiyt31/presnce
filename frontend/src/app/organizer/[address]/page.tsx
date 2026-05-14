"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { EventCard } from "@/components/EventCard";
import { getReadClient, CONTRACT_ADDRESS } from "@/lib/genlayer";
import { shortAddr } from "@/lib/utils";
import type { OrganizerProfile, EventRecord } from "@/types";

export default function OrganizerPage({ params }: { params: { address: string } }) {
  const { address } = params;
  const [organizer, setOrganizer] = useState<OrganizerProfile | null>(null);
  const [events,    setEvents]    = useState<EventRecord[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    async function fetch() {
      if (!CONTRACT_ADDRESS) { setLoading(false); return; }
      try {
        const client = getReadClient();

        const org = await client.readContract({
          address:      CONTRACT_ADDRESS as `0x${string}`,
          functionName: "get_organizer",
          args:         [address] as any,
        }) as any;
        setOrganizer(org && org.organizer ? org as OrganizerProfile : null);

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
                return r && r.event_id !== undefined ? r as EventRecord : null;
              } catch { return null; }
            })
          );
          setEvents(records.filter(Boolean) as EventRecord[]);
        }
      } catch (e) {
        console.error("organizer page:", e);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [address]);

  if (loading) {
    return (
      <div className="min-h-dvh flex flex-col">
        <Navbar />
        <main className="flex-1 px-4 sm:px-6 py-10 max-w-6xl mx-auto w-full space-y-4">
          <div className="skeleton h-4 w-24" />
          <div className="skeleton h-24 w-full" />
          <div className="grid sm:grid-cols-3 gap-4 mt-8">
            {[1,2,3].map(i => <div key={i} className="skeleton h-48 w-full" />)}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <Navbar />
      <main className="flex-1 px-4 sm:px-6 py-10 max-w-6xl mx-auto w-full">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-mono text-ink-500 mb-8 animate-fade-up">
          <Link href="/events" className="hover:text-violet-light transition-colors">Events</Link>
          <span>/</span>
          <span className="text-ink-300">{shortAddr(address)}</span>
        </div>

        {/* Organizer header */}
        <div className="card p-6 mb-8 animate-fade-up">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 border border-violet/40 flex items-center justify-center">
                  <div className="w-3 h-3 bg-violet/60" />
                </div>
                <div>
                  <p className="font-mono text-sm text-ink-100">{shortAddr(address)}</p>
                  {organizer?.is_verified && (
                    <span className="badge-verified">verified organizer</span>
                  )}
                </div>
              </div>
              {organizer?.profile_url && (
                <a href={organizer.profile_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-violet-light hover:underline mt-1 block">
                  {organizer.profile_url}
                </a>
              )}
            </div>
            <div className="text-right">
              <p className="font-mono text-3xl font-medium text-violet-light">{events.length}</p>
              <p className="text-xs text-ink-400">events hosted</p>
            </div>
          </div>
        </div>

        {/* Events */}
        <div className="animate-fade-up delay-100">
          <p className="section-label mb-6">Events by this organizer</p>
          {events.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm text-ink-400">No events hosted yet.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...events].reverse().map(ev => (
                <EventCard key={Number(ev.event_id)} event={ev} showActions />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

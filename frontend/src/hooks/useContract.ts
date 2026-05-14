"use client";
import { useState, useEffect, useCallback } from "react";
import { getReadClient, CONTRACT_ADDRESS } from "@/lib/genlayer";
import type {
  EventRecord, AttendanceRecord, OrganizerProfile,
  AttendanceCertificate, PlayerStats, ContractStats,
} from "@/types";

function isValidContract(): boolean {
  return !!CONTRACT_ADDRESS &&
    CONTRACT_ADDRESS !== "0xYourContractAddressHere" &&
    CONTRACT_ADDRESS.startsWith("0x");
}

// ─── useStats ─────────────────────────────────────────────────
export function useStats() {
  const [stats, setStats]   = useState<ContractStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!isValidContract()) { setLoading(false); return; }
    setLoading(true);
    try {
      const client = getReadClient();
      const result = await client.readContract({
        address:      CONTRACT_ADDRESS as `0x${string}`,
        functionName: "get_stats",
        args:         [],
      });
      setStats(result as unknown as ContractStats);
    } catch (e) {
      console.error("get_stats:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  return { stats, loading, refetch: fetchStats };
}

// ─── useEvent ─────────────────────────────────────────────────
export function useEvent(eventIdStr: string) {
  const [event, setEvent]   = useState<EventRecord | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (eventIdStr === "" || isNaN(Number(eventIdStr)) || !isValidContract()) {
      setEvent(null); return;
    }
    setLoading(true);
    try {
      const client = getReadClient();
      const result = await client.readContract({
        address:      CONTRACT_ADDRESS as `0x${string}`,
        functionName: "get_event",
        args:         [Number(eventIdStr)] as any,
      }) as any;
      setEvent(result && result.event_id !== undefined ? (result as EventRecord) : null);
    } catch (e) {
      console.error("get_event:", e);
      setEvent(null);
    } finally {
      setLoading(false);
    }
  }, [eventIdStr]);

  useEffect(() => {
    const t = setTimeout(fetch, 600);
    return () => clearTimeout(t);
  }, [fetch]);

  return { event, loading, refetch: fetch };
}

// ─── useAllEvents ─────────────────────────────────────────────
export function useAllEvents() {
  const [events, setEvents]  = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]    = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!isValidContract()) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const client = getReadClient();
      const result = await client.readContract({
        address:      CONTRACT_ADDRESS as `0x${string}`,
        functionName: "get_all_events",
        args:         [],
      }) as any;

      if (!Array.isArray(result) || result.length === 0) {
        setEvents([]); return;
      }
      const first = result[0];
      if (first && typeof first === "object" && "event_id" in first) {
        setEvents(result as EventRecord[]); return;
      }
      // fallback: array of ids
      const records = await Promise.all(
        (result as number[]).map(async (id) => {
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
    } catch (e: any) {
      console.error("get_all_events:", e);
      setError(e?.message ?? "Failed to load events");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  return { events, loading, error, refetch: fetchAll };
}

// ─── useMyEvents ──────────────────────────────────────────────
export function useMyEvents(address: string | null) {
  const [events, setEvents]  = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEvents = useCallback(async () => {
    if (!address || !isValidContract()) { setEvents([]); return; }
    setLoading(true);
    try {
      const client = getReadClient();
      const ids = await client.readContract({
        address:      CONTRACT_ADDRESS as `0x${string}`,
        functionName: "get_organizer_events",
        args:         [address] as any,
      }) as Array<number | bigint | string>;

      if (!ids || ids.length === 0) { setEvents([]); return; }

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
    } catch (e) {
      console.error("get_organizer_events:", e);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  return { events, loading, refetch: fetchEvents };
}

// ─── useAttendance ────────────────────────────────────────────
export function useAttendance(attendanceIdStr: string) {
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading]       = useState(false);

  const fetch = useCallback(async () => {
    if (attendanceIdStr === "" || isNaN(Number(attendanceIdStr)) || !isValidContract()) {
      setAttendance(null); return;
    }
    setLoading(true);
    try {
      const client = getReadClient();
      const result = await client.readContract({
        address:      CONTRACT_ADDRESS as `0x${string}`,
        functionName: "get_attendance",
        args:         [Number(attendanceIdStr)] as any,
      }) as any;
      setAttendance(result && result.attendance_id !== undefined ? (result as AttendanceRecord) : null);
    } catch (e) {
      console.error("get_attendance:", e);
      setAttendance(null);
    } finally {
      setLoading(false);
    }
  }, [attendanceIdStr]);

  useEffect(() => { fetch(); }, [fetch]);
  return { attendance, loading, refetch: fetch };
}

// ─── useEventAttendances ──────────────────────────────────────
export function useEventAttendances(eventId: number | null) {
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading]         = useState(false);

  const fetchAttendances = useCallback(async () => {
    if (eventId === null || !isValidContract()) { setAttendances([]); return; }
    setLoading(true);
    try {
      const client = getReadClient();
      // Brute-force scan — same pattern as useDisputesForWork in OriginMark
      const MAX_SCAN = 100;
      const found: AttendanceRecord[] = [];
      for (let id = 0; id < MAX_SCAN; id++) {
        try {
          const r = await client.readContract({
            address:      CONTRACT_ADDRESS as `0x${string}`,
            functionName: "get_attendance",
            args:         [id] as any,
          }) as any;
          if (!r || r.attendance_id === undefined) break;
          if (Number(r.event_id) === eventId && !r.is_revoked) {
            found.push(r as AttendanceRecord);
          }
        } catch { break; }
      }
      setAttendances(found);
    } catch (e) {
      console.error("event-attendances:", e);
      setAttendances([]);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { fetchAttendances(); }, [fetchAttendances]);
  return { attendances, loading, refetch: fetchAttendances };
}

// ─── useMyAttendances ─────────────────────────────────────────
export function useMyAttendances(address: string | null) {
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading]         = useState(false);

  const fetchAttendances = useCallback(async () => {
    if (!address || !isValidContract()) { setAttendances([]); return; }
    setLoading(true);
    try {
      const client = getReadClient();
      const ids = await client.readContract({
        address:      CONTRACT_ADDRESS as `0x${string}`,
        functionName: "get_attendee_history",
        args:         [address] as any,
      }) as Array<number | bigint | string>;

      if (!ids || ids.length === 0) { setAttendances([]); return; }

      const records = await Promise.all(
        ids.map(async (id) => {
          try {
            const r = await client.readContract({
              address:      CONTRACT_ADDRESS as `0x${string}`,
              functionName: "get_attendance",
              args:         [Number(id)] as any,
            }) as any;
            return r && r.attendance_id !== undefined ? (r as AttendanceRecord) : null;
          } catch { return null; }
        })
      );
      setAttendances(records.filter(Boolean) as AttendanceRecord[]);
    } catch (e) {
      console.error("get_attendee_history:", e);
      setAttendances([]);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => { fetchAttendances(); }, [fetchAttendances]);
  return { attendances, loading, refetch: fetchAttendances };
}

// ─── useCertificate ───────────────────────────────────────────
export function useMyCertificates(address: string | null) {
  const [certs, setCerts]    = useState<AttendanceCertificate[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCerts = useCallback(async () => {
    if (!address || !isValidContract()) { setCerts([]); return; }
    setLoading(true);
    try {
      const client = getReadClient();
      const ids = await client.readContract({
        address:      CONTRACT_ADDRESS as `0x${string}`,
        functionName: "get_player_certificates",
        args:         [address] as any,
      }) as Array<number | bigint | string>;

      if (!ids || ids.length === 0) { setCerts([]); return; }

      const records = await Promise.all(
        ids.map(async (id) => {
          try {
            const r = await client.readContract({
              address:      CONTRACT_ADDRESS as `0x${string}`,
              functionName: "get_certificate",
              args:         [Number(id)] as any,
            }) as any;
            return r && r.token_id !== undefined ? (r as AttendanceCertificate) : null;
          } catch { return null; }
        })
      );
      setCerts(records.filter(Boolean) as AttendanceCertificate[]);
    } catch (e) {
      console.error("get_player_certificates:", e);
      setCerts([]);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => { fetchCerts(); }, [fetchCerts]);
  return { certs, loading, refetch: fetchCerts };
}

// ─── useOrganizer ─────────────────────────────────────────────
export function useOrganizer(address: string | null) {
  const [organizer, setOrganizer] = useState<OrganizerProfile | null>(null);
  const [loading, setLoading]     = useState(false);

  const fetchOrg = useCallback(async () => {
    if (!address || !isValidContract()) { setOrganizer(null); return; }
    setLoading(true);
    try {
      const client = getReadClient();
      const result = await client.readContract({
        address:      CONTRACT_ADDRESS as `0x${string}`,
        functionName: "get_organizer",
        args:         [address] as any,
      }) as any;
      setOrganizer(result && result.organizer ? (result as OrganizerProfile) : null);
    } catch (e) {
      console.error("get_organizer:", e);
      setOrganizer(null);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => { fetchOrg(); }, [fetchOrg]);
  return { organizer, loading, refetch: fetchOrg };
}

"use client";
import { useState, useEffect, useCallback } from "react";
import { getReadClient, CONTRACT_ADDRESS } from "@/lib/genlayer";
import { useWallet } from "@/hooks/useWallet";

const STORAGE_KEY = "presnce:nicknames";

// ── localStorage helpers ───────────────────────────────────────
function getCached(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}

function setCached(address: string, name: string) {
  const all = getCached();
  if (name) all[address.toLowerCase()] = name;
  else delete all[address.toLowerCase()];
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    window.dispatchEvent(new Event("presnce:nickname-updated"));
  }
}

function getCachedName(address: string): string {
  return getCached()[address.toLowerCase()] || "";
}

// ── On-chain fetch ─────────────────────────────────────────────
async function fetchOnchainNickname(address: string): Promise<string> {
  if (!CONTRACT_ADDRESS || !address) return "";
  try {
    const client = getReadClient();
    const result = await client.readContract({
      address:      CONTRACT_ADDRESS as `0x${string}`,
      functionName: "get_nickname",
      args:         [address] as any,
    }) as any;
    return typeof result === "string" ? result : "";
  } catch {
    return "";
  }
}

// ── displayName (sync, uses cache) ────────────────────────────
export function displayName(address: string): string {
  if (!address) return "";
  const nick = getCachedName(address);
  if (nick) return nick;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function getNicknameFor(address: string): string {
  return getCachedName(address);
}

// ── useDisplayName — reactive, fetches chain if not cached ─────
export function useDisplayName(address: string | null) {
  const [name, setName] = useState<string>(() =>
    address ? (getCachedName(address) || `${address.slice(0,6)}...${address.slice(-4)}`) : ""
  );

  useEffect(() => {
    if (!address) { setName(""); return; }

    const update = () => {
      const cached = getCachedName(address);
      setName(cached || `${address.slice(0,6)}...${address.slice(-4)}`);
    };

    update();

    // If not cached, fetch from chain
    if (!getCachedName(address)) {
      fetchOnchainNickname(address).then(onchain => {
        if (onchain) {
          setCached(address, onchain);
          setName(onchain);
        }
      });
    }

    window.addEventListener("presnce:nickname-updated", update);
    return () => window.removeEventListener("presnce:nickname-updated", update);
  }, [address]);

  return name;
}

// ── useNickname — for the current user with set capability ─────
export function useNickname(address: string | null) {
  const { writeContract } = useWallet();
  const [nickname,  setNickname]  = useState<string>("");
  const [editing,   setEditing]   = useState(false);
  const [draft,     setDraft]     = useState("");
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!address) return;

    // Load from cache first
    const cached = getCachedName(address);
    if (cached) setNickname(cached);

    // Then fetch from chain
    fetchOnchainNickname(address).then(onchain => {
      if (onchain) {
        setCached(address, onchain);
        setNickname(onchain);
      }
    });

    const update = () => setNickname(getCachedName(address) || "");
    window.addEventListener("presnce:nickname-updated", update);
    return () => window.removeEventListener("presnce:nickname-updated", update);
  }, [address]);

  const save = useCallback(async (name: string) => {
    if (!address || !name.trim()) return;
    setSaving(true);
    setSaveError("");
    try {
      // Save on-chain (free, no fee)
      await writeContract("set_nickname", [name.trim().slice(0, 32)]);
      // Also update cache immediately
      setCached(address, name.trim().slice(0, 32));
      setNickname(name.trim().slice(0, 32));
      setEditing(false);
    } catch (err: any) {
      // Fallback: save to localStorage only
      setCached(address, name.trim().slice(0, 32));
      setNickname(name.trim().slice(0, 32));
      setEditing(false);
      setSaveError(err?.message || "Saved locally only");
    } finally {
      setSaving(false);
    }
  }, [address, writeContract]);

  const startEdit  = useCallback(() => { setDraft(nickname); setEditing(true); setSaveError(""); }, [nickname]);
  const cancelEdit = useCallback(() => { setEditing(false); setDraft(""); setSaveError(""); }, []);

  return { nickname, editing, draft, setDraft, save, startEdit, cancelEdit, saving, saveError };
}
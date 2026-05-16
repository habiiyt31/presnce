"use client";
import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "presnce:nicknames";

export function getAllNicknames(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}

export function getNicknameFor(address: string): string {
  if (!address) return "";
  return getAllNicknames()[address.toLowerCase()] || "";
}

export function displayName(address: string): string {
  if (!address) return "";
  const nick = getNicknameFor(address);
  if (nick) return nick;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function setNicknameStorage(address: string, name: string) {
  const all = getAllNicknames();
  if (name.trim()) {
    all[address.toLowerCase()] = name.trim().slice(0, 32);
  } else {
    delete all[address.toLowerCase()];
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  // Dispatch event so other components update
  window.dispatchEvent(new Event("presnce:nickname-updated"));
}

export function useNickname(address: string | null) {
  const [nickname, setNickname] = useState<string>("");
  const [editing,  setEditing]  = useState(false);
  const [draft,    setDraft]    = useState("");

  useEffect(() => {
    if (!address) return;
    const update = () => setNickname(getNicknameFor(address));
    update();
    window.addEventListener("presnce:nickname-updated", update);
    return () => window.removeEventListener("presnce:nickname-updated", update);
  }, [address]);

  const save = useCallback((name: string) => {
    if (!address) return;
    setNicknameStorage(address, name);
    setNickname(name.trim().slice(0, 32));
    setEditing(false);
  }, [address]);

  const startEdit  = useCallback(() => { setDraft(nickname); setEditing(true); }, [nickname]);
  const cancelEdit = useCallback(() => { setEditing(false); setDraft(""); }, []);

  return { nickname, editing, draft, setDraft, save, startEdit, cancelEdit };
}

// Hook to reactively show nickname for any address
export function useDisplayName(address: string | null) {
  const [name, setName] = useState<string>("");

  useEffect(() => {
    if (!address) { setName(""); return; }
    const update = () => setName(displayName(address));
    update();
    window.addEventListener("presnce:nickname-updated", update);
    return () => window.removeEventListener("presnce:nickname-updated", update);
  }, [address]);

  return name;
}

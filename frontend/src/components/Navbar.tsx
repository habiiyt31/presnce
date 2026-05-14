"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";
import { shortAddr } from "@/lib/utils";
import { useState, useEffect } from "react";
import { ensureNetwork, getEthereum, CHAIN } from "@/lib/genlayer";

const LINKS = [
  { href: "/events",         label: "Explore"      },
  { href: "/create-event",   label: "Host"         },
  { href: "/claim",          label: "Claim"        },
  { href: "/apply-verified", label: "Get Verified" },
  { href: "/my-events",      label: "My Events"    },
];

const FingerprintLogo = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
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
);

function NetworkBanner() {
  const expectedHex = "0x" + ((CHAIN as any).id as number).toString(16);
  const [currentHex, setCurrentHex] = useState<string | null>(null);
  const [switching, setSwitching]   = useState(false);

  useEffect(() => {
    const eth = getEthereum();
    if (!eth) return;
    eth.request({ method: "eth_chainId" }).then((id: string) => setCurrentHex(id)).catch(() => {});
    const h = (id: string) => setCurrentHex(id);
    eth.on?.("chainChanged", h);
    return () => { try { eth.removeListener?.("chainChanged", h); } catch {} };
  }, []);

  if (!currentHex || currentHex.toLowerCase() === expectedHex.toLowerCase()) return null;

  return (
    <button
      onClick={async () => { setSwitching(true); try { await ensureNetwork(); } finally { setSwitching(false); } }}
      disabled={switching}
      className="hide-xs"
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "5px 12px", borderRadius: 20,
        background: "#FEE2E2", border: "1px solid #FECACA",
        color: "#991B1B", fontSize: 11, fontWeight: 600,
        letterSpacing: ".04em", textTransform: "uppercase", cursor: "pointer",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#EF4444" }} />
      {switching ? "Switching..." : "Wrong network"}
    </button>
  );
}

function WalletButton() {
  const { address, isConnected, isConnecting, connect, disconnect } = useWallet();
  if (!isConnected) {
    return (
      <button onClick={connect} disabled={isConnecting} className="btn-primary nav-wallet"
        style={{ padding: "8px 18px", fontSize: 13 }}>
        {isConnecting ? "Connecting..." : "Connect wallet"}
      </button>
    );
  }
  return (
    <button onClick={disconnect} className="nav-wallet" style={{
      display: "flex", alignItems: "center", gap: 7,
      padding: "7px 14px", borderRadius: 10,
      background: "var(--surface)", border: "1.5px solid var(--ink-6)",
      color: "var(--ink-2)", fontSize: 13, fontWeight: 500,
      fontFamily: "'JetBrains Mono',monospace", cursor: "pointer",
      boxShadow: "var(--shadow-sm)",
    }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--teal)" }} />
      {shortAddr(address!)}
    </button>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 50,
      background: "rgba(248,249,250,.92)",
      backdropFilter: "blur(12px)",
      borderBottom: "1px solid var(--ink-6)",
    }}>
      <div className="container">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 58 }}>

          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
            <FingerprintLogo size={28} />
            <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-.03em", color: "var(--ink)" }}>
              Presnce
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="nav-links" style={{ display: "flex", alignItems: "center", gap: 2 }}>
            {LINKS.map(l => (
              <Link key={l.href} href={l.href} style={{
                padding: "6px 12px", borderRadius: 8,
                fontSize: 13, fontWeight: pathname === l.href ? 600 : 500,
                color: pathname === l.href ? "var(--teal)" : "var(--ink-3)",
                background: pathname === l.href ? "var(--teal-bg)" : "transparent",
                textDecoration: "none", transition: "all .15s",
              }}>
                {l.label}
              </Link>
            ))}
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <NetworkBanner />
            <WalletButton />
            {/* Mobile hamburger */}
            <button
              onClick={() => setOpen(!open)}
              style={{
                display: "none", padding: 8, background: "none", border: "none",
                cursor: "pointer", color: "var(--ink-3)",
              }}
              className="show-mobile"
              aria-label="Menu"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                {open
                  ? <><path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></>
                  : <><path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></>
                }
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {open && (
          <nav style={{
            borderTop: "1px solid var(--ink-6)",
            padding: "12px 0 16px",
            display: "flex", flexDirection: "column", gap: 4,
          }}>
            {LINKS.map(l => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} style={{
                padding: "9px 12px", borderRadius: 8,
                fontSize: 14, fontWeight: pathname === l.href ? 600 : 500,
                color: pathname === l.href ? "var(--teal)" : "var(--ink-2)",
                background: pathname === l.href ? "var(--teal-bg)" : "transparent",
                textDecoration: "none",
              }}>
                {l.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}

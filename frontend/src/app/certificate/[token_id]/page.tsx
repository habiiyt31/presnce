"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { getReadClient, CONTRACT_ADDRESS } from "@/lib/genlayer";
import { formatDate } from "@/lib/utils";
import { useDisplayName } from "@/hooks/useNickname";
import type { AttendanceCertificate } from "@/types";

function OwnerName({ address }: { address: string }) {
  const name = useDisplayName(address);
  return <>{name || `${address.slice(0,6)}...${address.slice(-4)}`}</>;
}

export default function CertificatePage({ params }: { params: { token_id: string } }) {
  const { token_id } = params;
  const [cert, setCert]     = useState<AttendanceCertificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied,  setCopied]  = useState(false);
  const [sharing, setSharing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    async function fetch() {
      if (!CONTRACT_ADDRESS || isNaN(Number(token_id))) { setLoading(false); return; }
      try {
        const client = getReadClient();
        const result = await client.readContract({
          address:      CONTRACT_ADDRESS as `0x${string}`,
          functionName: "get_certificate",
          args:         [Number(token_id)] as any,
        }) as any;
        setCert(result && result.token_id !== undefined ? result as AttendanceCertificate : null);
      } catch { setCert(null); }
      finally  { setLoading(false); }
    }
    fetch();
  }, [token_id]);

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareToX() {
    if (!cert) return;
    setSharing(true);
    try {
      const { downloadCertImage, buildXShareUrl } = await import("@/lib/certCanvas");
      window.open(buildXShareUrl(cert), "_blank", "noopener,noreferrer");
      await downloadCertImage(cert);
    } catch (e) { console.error(e); }
    finally { setSharing(false); }
  }

  async function downloadPNG() {
    if (!cert) return;
    setDownloading(true);
    try {
      const { downloadCertImage } = await import("@/lib/certCanvas");
      await downloadCertImage(cert);
    } catch (e) { console.error(e); }
    finally { setDownloading(false); }
  }

  const confidenceColor =
    cert && cert.confidence >= 80 ? "var(--verify-green)" :
    cert && cert.confidence >= 60 ? "var(--teal)"         : "var(--verify-amber)";

  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
        <Navbar />
        <main style={{ flex: 1, maxWidth: 680, margin: "0 auto", width: "100%", padding: "clamp(28px,4vw,48px) clamp(16px,4vw,24px)" }}>
          <div className="skeleton" style={{ height: 16, width: 140, marginBottom: 24 }} />
          <div className="skeleton" style={{ height: 400 }} />
        </main>
      </div>
    );
  }

  if (!cert) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
        <Navbar />
        <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 48, color: "var(--ink-6)", marginBottom: 16 }}>
              #{String(token_id).padStart(4,"0")}
            </p>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Certificate not found</h2>
            <Link href="/my-events" className="btn-secondary" style={{ fontSize: 13 }}>My Events</Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <main style={{ flex: 1, maxWidth: 680, margin: "0 auto", width: "100%", padding: "clamp(28px,4vw,48px) clamp(16px,4vw,24px)" }}>

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-4)", marginBottom: 28 }}>
          <Link href="/dashboard" style={{ color: "var(--teal)", textDecoration: "none" }}>Dashboard</Link>
          <span>/</span>
          <span>Certificate #{String(cert.token_id).padStart(4,"0")}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--verify-green)" }} />
          <p className="section-label">On-chain attendance certificate</p>
        </div>
        <h1 style={{ fontSize: "clamp(24px,4vw,32px)", fontWeight: 800, letterSpacing: "-.03em", marginBottom: 28 }}>
          Proof of presence.
        </h1>

        {/* Certificate card */}
        <div className="card" style={{ padding: "clamp(24px,4vw,40px)", marginBottom: 16, position: "relative", overflow: "hidden" }}>
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 4,
            background: "linear-gradient(90deg, var(--teal), #6366F1)",
          }} />

          {/* Token + Confidence */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-4)", marginBottom: 6 }}>
                Certificate
              </div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "clamp(40px,8vw,64px)", fontWeight: 700, color: "#6366F1", letterSpacing: "-.02em", lineHeight: 1 }}>
                #{String(cert.token_id).padStart(4,"0")}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-4)", marginBottom: 6 }}>
                AI Confidence
              </div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "clamp(40px,8vw,64px)", fontWeight: 700, color: confidenceColor, letterSpacing: "-.02em", lineHeight: 1 }}>
                {cert.confidence}%
              </div>
            </div>
          </div>

          {/* Confidence bar */}
          <div className="conf-track" style={{ marginBottom: 4 }}>
            <div className="conf-fill" style={{ width: `${cert.confidence}%` }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--ink-4)", fontFamily: "'JetBrains Mono',monospace", marginBottom: 24 }}>
            <span>uncertain</span><span>likely</span><span>verified</span>
          </div>

          <div className="divider" style={{ marginBottom: 20 }} />

          {/* Event name */}
          <h2 style={{ fontSize: "clamp(16px,3vw,22px)", fontWeight: 700, letterSpacing: "-.02em", marginBottom: 20, overflowWrap: "anywhere" }}>
            {cert.event_name}
          </h2>

          {/* Details grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { label: "Date",     value: formatDate(cert.event_date), teal: false },
              { label: "Location", value: cert.event_location,         teal: false },
              { label: "Owner",    value: <OwnerName address={cert.owner} />, teal: false },
              { label: "Event",    value: `#${String(cert.event_id).padStart(4,"0")}`, teal: true },
            ].map(r => (
              <div key={r.label} style={{ background: r.teal ? "var(--teal-bg)" : "var(--ink-8)", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-4)", marginBottom: 4 }}>{r.label}</div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 600, color: r.teal ? "var(--teal)" : "var(--ink-2)", overflowWrap: "anywhere" }}>
                  {r.value}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--ink-6)", display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-4)", fontFamily: "'JetBrains Mono',monospace" }}>
            <span>Presnce</span>
            <span>GenLayer Studionet</span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
          <button onClick={shareToX} disabled={sharing} className="btn-primary" style={{ fontSize: 13 }}>
            {sharing ? "Generating..." : "Share to X 🐦"}
          </button>
          <button onClick={downloadPNG} disabled={downloading} className="btn-secondary" style={{ fontSize: 13 }}>
            {downloading ? "Saving..." : "Download PNG"}
          </button>
          <button onClick={copyLink} className="btn-secondary" style={{ fontSize: 13 }}>
            {copied ? "✓ Copied!" : "Copy link"}
          </button>
          <Link href={`/event/${cert.event_id}`} className="btn-secondary" style={{ textAlign: "center", fontSize: 13 }}>
            View event
          </Link>
        </div>

        <p style={{ marginTop: 12, fontSize: 11, color: "var(--ink-4)", textAlign: "center" }}>
          Share to X will open a tweet + auto-download the PNG. Attach the PNG to your tweet!
        </p>
      </main>
    </div>
  );
}

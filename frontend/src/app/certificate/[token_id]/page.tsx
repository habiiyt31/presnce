"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { getReadClient, CONTRACT_ADDRESS } from "@/lib/genlayer";
import { shortAddr, formatDate } from "@/lib/utils";
import type { AttendanceCertificate } from "@/types";

export default function CertificatePage({ params }: { params: { token_id: string } }) {
  const { token_id } = params;
  const [cert, setCert]     = useState<AttendanceCertificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied]   = useState(false);

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

  const confidenceColor =
    cert && cert.confidence >= 80 ? "text-sage-light" :
    cert && cert.confidence >= 60 ? "text-violet-light" : "text-amber";

  if (loading) {
    return (
      <div className="min-h-dvh flex flex-col">
        <Navbar />
        <main className="flex-1 px-4 sm:px-6 py-10 max-w-2xl mx-auto w-full space-y-4">
          <div className="skeleton h-4 w-24" />
          <div className="skeleton h-64 w-full" />
        </main>
      </div>
    );
  }

  if (!cert) {
    return (
      <div className="min-h-dvh flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <p className="font-mono text-4xl text-ink-600 mb-4">#{token_id.padStart(4,"0")}</p>
            <h2 className="font-display text-xl text-ink-100 mb-2">Certificate not found</h2>
            <p className="text-sm text-ink-400 mb-6">This certificate ID doesn't exist.</p>
            <Link href="/events" className="btn-secondary">Browse events</Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <Navbar />
      <main className="flex-1 px-4 sm:px-6 py-10 max-w-2xl mx-auto w-full">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-mono text-ink-500 mb-8 animate-fade-up">
          <Link href="/my-events" className="hover:text-violet-light transition-colors">My Events</Link>
          <span>/</span>
          <span className="text-ink-300">Certificate #{String(cert.token_id).padStart(4,"0")}</span>
        </div>

        <div className="animate-fade-up">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-violet-light animate-pulse" />
            <p className="section-label">On-chain attendance certificate</p>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink-50 mb-8">
            Proof of presence.
          </h1>

          {/* Certificate card */}
          <div className="relative border border-violet/30 bg-gradient-to-br from-ink-800 to-ink-900 rounded-sm p-6 sm:p-10 mb-6 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 pointer-events-none"
              style={{ background: "radial-gradient(circle, #7C5CBF 0%, transparent 70%)" }} />
            <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full opacity-5 pointer-events-none"
              style={{ background: "radial-gradient(circle, #A080E0 0%, transparent 70%)" }} />

            {/* Token ID + Confidence */}
            <div className="flex items-start justify-between mb-8 gap-4 relative">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-violet/60 mb-1">Certificate</p>
                <p className="font-display text-5xl sm:text-6xl font-bold text-violet-light leading-none">
                  #{String(cert.token_id).padStart(4,"0")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-mono uppercase tracking-wider text-ink-500 mb-1">AI Confidence</p>
                <p className={`font-display text-5xl sm:text-6xl font-bold leading-none ${confidenceColor}`}>
                  {cert.confidence}%
                </p>
              </div>
            </div>

            {/* Confidence bar */}
            <div className="mb-8 relative">
              <div className="h-1.5 bg-ink-700 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-violet to-violet-light transition-all duration-1000"
                  style={{ width: `${cert.confidence}%` }} />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-ink-600 mt-1">
                <span>uncertain</span>
                <span>likely</span>
                <span>verified</span>
              </div>
            </div>

            <div className="divider mb-6 relative" />

            {/* Event info */}
            <h2 className="font-display text-xl sm:text-2xl font-bold text-ink-50 mb-6 leading-snug relative">
              {cert.event_name}
            </h2>

            <div className="grid grid-cols-2 gap-5 text-xs relative">
              <div>
                <p className="text-ink-500 mb-1">Date</p>
                <p className="font-mono text-ink-200">{formatDate(cert.event_date)}</p>
              </div>
              <div>
                <p className="text-ink-500 mb-1">Location</p>
                <p className="text-ink-200">{cert.event_location}</p>
              </div>
              <div>
                <p className="text-ink-500 mb-1">Owner</p>
                <p className="font-mono text-ink-200">{shortAddr(cert.owner)}</p>
              </div>
              <div>
                <p className="text-ink-500 mb-1">Event ID</p>
                <p className="font-mono text-ink-200">#{String(cert.event_id).padStart(4,"0")}</p>
              </div>
            </div>

            {/* Presnce watermark */}
            <div className="mt-8 pt-5 border-t border-ink-700/50 flex items-center justify-between relative">
              <p className="font-display text-xs italic text-ink-600">Presnce</p>
              <p className="font-mono text-[10px] text-ink-600">Built on GenLayer Studionet</p>
            </div>
          </div>

          {/* Actions */}
          <div className="grid sm:grid-cols-3 gap-3">
            <button onClick={copyLink} className="btn-secondary text-sm py-3">
              {copied ? "✓ Copied!" : "Copy link"}
            </button>
            <Link href={`/event/${cert.event_id}`} className="btn-secondary text-center text-sm py-3">
              View event
            </Link>
            <Link href="/my-events" className="btn-primary text-center text-sm py-3">
              My certificates
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

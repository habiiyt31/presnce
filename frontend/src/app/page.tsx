"use client";
import { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { useStats, useAllEvents, usePlatformCounts } from "@/hooks/useContract";

const FingerprintLogo = ({ size = 36 }: { size?: number }) => (
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

function StatsRow() {
  const { stats }  = useStats();
  const { events } = useAllEvents();
  const platform   = usePlatformCounts();
  const derivedOrgs = new Set(events.map((e: any) => String(e.organizer).toLowerCase())).size;
  const n = (v: any) => v !== undefined && v !== null ? Number(v) : 0;
  const items = [
    { label: "Events hosted",       value: Math.max(n(stats?.total_events),       events.length)           },
    { label: "Attendance claims",   value: Math.max(n(stats?.total_attendances),  platform.attendances)    },
    { label: "Certificates issued", value: Math.max(n(stats?.total_certificates), platform.certificates)   },
  ];
  return (
    <div style={{
      borderTop: "1px solid var(--ink-6)",
      borderBottom: "1px solid var(--ink-6)",
      background: "var(--surface)",
    }}>
      <div style={{
        maxWidth: 1100, margin: "0 auto", padding: "0 24px",
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
      }}>
        {items.map((s, i) => (
          <div key={s.label} style={{
            padding: "16px clamp(10px,2vw,24px)",
            borderRight: i < 3 ? "1px solid var(--ink-6)" : "none",
          }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--teal)", letterSpacing: "-.03em", lineHeight: 1 }}>
              {s.value}
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-4)", marginTop: 4, fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <main style={{ flex: 1 }}>

        {/* Hero */}
        <section style={{ maxWidth: 1100, margin: "0 auto", padding: "clamp(40px, 6vw, 72px) 24px clamp(40px, 5vw, 64px)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))", gap: "clamp(28px,4vw,56px)", alignItems: "start" }}>

            {/* Left */}
            <div>
              <div className="animate-fade-in" style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "var(--teal-bg)", border: "1px solid var(--teal-border)",
                borderRadius: 20, padding: "5px 14px", marginBottom: 24,
              }}>
              </div>

              <h1 className="animate-fade-up delay-100" style={{
                fontSize: "clamp(40px,5vw,60px)",
                fontWeight: 800,
                letterSpacing: "-.04em",
                lineHeight: 1.04,
                color: "var(--ink)",
                marginBottom: 20,
              }}>
                Prove you<br />
                <span style={{ color: "var(--teal)" }}>were there.</span>
              </h1>

              <p className="animate-fade-up delay-200" style={{
                fontSize: 16, color: "var(--ink-3)", lineHeight: 1.75,
                maxWidth: 440, marginBottom: 32,
              }}>
                AI validators fetch your proof from the internet and issue
                a tamper-proof attendance certificate on GenLayer no QR
                codes, no check-in apps, no centralized databases.
              </p>

              <div className="animate-fade-up delay-300" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Link href="/events" className="btn-primary">Explore events</Link>
                <Link href="/create-event" className="btn-secondary">Host an event</Link>
              </div>

              <p className="animate-fade-up delay-400" style={{ marginTop: 20, fontSize: 13, color: "var(--ink-4)" }}>
                Already attended?{" "}
                <Link href="/claim" style={{ color: "var(--teal)", fontWeight: 600 }}>
                  Claim your attendance →
                </Link>
              </p>
            </div>

            {/* Right — live UI cards */}
            <div className="animate-fade-in delay-200" style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Verdict card */}
              <div className="card" style={{ padding: "22px 24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-4)" }}>AI Verdict</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-4)", background: "var(--ink-7)", borderRadius: 20, padding: "1px 7px" }}>example</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#10B981" }} />
                      <span style={{ fontSize: 20, fontWeight: 800, color: "var(--ink)", letterSpacing: "-.02em" }}>Valid</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-4)", marginBottom: 5 }}>
                      Confidence
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--teal)", letterSpacing: "-.02em" }}>94%</div>
                  </div>
                </div>

                <div className="conf-track" style={{ marginBottom: 14 }}>
                  <div className="conf-fill" style={{ width: "94%" }} />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-4)", letterSpacing: ".06em", textTransform: "uppercase" }}>
                    5 validators
                  </span>
                  <div style={{ display: "flex", gap: 5 }}>
                    {[0,1,2,3,4].map(i => (
                      <span key={i} style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: "var(--teal)", display: "block",
                      }} />
                    ))}
                  </div>
                </div>

                <div style={{
                  background: "var(--ink-8)", borderRadius: 9, padding: "10px 13px",
                  fontSize: 12, color: "var(--ink-3)", lineHeight: 1.6, fontStyle: "italic",
                }}>
                  "RSVP confirmation matches event date and location."
                </div>
              </div>

              {/* Certificate card */}
              <div className="card" style={{ padding: "22px 24px", position: "relative", overflow: "hidden" }}>
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 3,
                  background: "linear-gradient(90deg, var(--teal), var(--indigo-DEFAULT, #6366F1))",
                }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-4)" }}>
                      Certificate
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-4)", background: "var(--ink-7)", borderRadius: 20, padding: "1px 7px" }}>
                      example
                    </span>
                  </div>
                  <span className="badge badge-onchain">on-chain</span>
                </div>
                <div style={{
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: 30, fontWeight: 700, color: "#6366F1",
                  letterSpacing: "-.02em", marginBottom: 4,
                }}>
                  #0042
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 16 }}>
                  GenLayer Builder Summit
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[
                    { label: "Date",     value: "Jun 15, 2026", highlight: false },
                    { label: "Location", value: "Bandung, ID",  highlight: false },
                    { label: "AI Score", value: "94%",          highlight: true  },
                    { label: "Status",   value: "active",       highlight: true  },
                  ].map(r => (
                    <div key={r.label} style={{
                      background: r.highlight ? "var(--teal-bg)" : "var(--ink-8)",
                      borderRadius: 8, padding: "9px 11px",
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-4)", marginBottom: 3 }}>{r.label}</div>
                      <div style={{
                        fontFamily: "'JetBrains Mono',monospace",
                        fontSize: 12, fontWeight: 600,
                        color: r.highlight ? "var(--teal)" : "var(--ink-2)",
                      }}>
                        {r.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <StatsRow />

        {/* How it works */}
        <section style={{ maxWidth: 1100, margin: "0 auto", padding: "72px 24px" }}>
          <div style={{ marginBottom: 48 }}>
            <div className="section-label" style={{ marginBottom: 10 }}>How it works</div>
            <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-.03em", color: "var(--ink)", maxWidth: 500 }}>
              Host. Attend. Get certified.
            </h2>
            <p style={{ fontSize: 15, color: "var(--ink-3)", marginTop: 12, maxWidth: 520, lineHeight: 1.7 }}>
              No QR codes. No check-in apps. Submit proof of where you were — AI does the rest.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: 16 }}>
            {[
              {
                num: "01", accent: "#0D9488",
                title: "Organizer creates event",
                body: "Create your event on Presnce with name, location, and date. Share the event ID with attendees so they can claim after.",
                example: "e.g. Claim at presnce.xyz/claim — Event ID: #0001",
              },
              {
                num: "02", accent: "#6366F1",
                title: "Attendee submits proof",
                body: "After attending, submit any public proof — a tweet mentioning the event, a photo from the venue, or your RSVP link.",
                example: "e.g. Tweet: \"Just attended GenLayer Meetup Bandung!\"",
              },
              {
                num: "03", accent: "#10B981",
                title: "AI verifies, you get certified",
                body: "AI checks your proof against the event details. If it matches, mint your permanent on-chain certificate.",
                example: "e.g. Certificate #0042 — verified, 94% confidence",
              },
            ].map((step, i) => (
              <div key={step.num} className="card animate-fade-up" style={{
                padding: 28, borderTop: `3px solid ${step.accent}`,
                animationDelay: `${i * 80}ms`,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: step.accent, letterSpacing: ".08em", marginBottom: 14, opacity: .7 }}>
                  {step.num}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", letterSpacing: "-.01em", marginBottom: 10 }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.7, marginBottom: 14 }}>{step.body}</p>
                {"example" in step && (
                  <div style={{
                    fontSize: 11, fontStyle: "italic", padding: "8px 11px",
                    borderRadius: 8, lineHeight: 1.5, color: step.accent,
                    background: step.accent === "#0D9488" ? "rgba(13,148,136,.06)" : step.accent === "#6366F1" ? "rgba(99,102,241,.06)" : "rgba(16,185,129,.06)",
                  }}>
                    {(step as any).example}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* GenLayer CTA */}
        <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 80px" }}>
          <div className="card" style={{
            padding: "48px 56px",
            background: "linear-gradient(135deg, var(--teal-bg) 0%, #EEF2FF 100%)",
            border: "1.5px solid var(--teal-border)",
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: 36, alignItems: "center" }}>
              <div>
                <div className="section-label" style={{ marginBottom: 12 }}>Why GenLayer</div>
                <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.03em", color: "var(--ink)", marginBottom: 14, lineHeight: 1.2 }}>
                  The only event platform that reads the internet.
                </h2>
                <p style={{ fontSize: 14, color: "var(--ink-3)", lineHeight: 1.75, marginBottom: 24 }}>
                  Unlike POAP or EventBrite, Presnce uses AI to actually verify
                  your proof the contract reads your ticket, tweet, or photo
                  from the internet and issues a certificate only if you were
                  really there. No fakes. No manual review.
                </p>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <Link href="/create-event" className="btn-primary">Host an event</Link>
                  <Link href="/events" className="btn-secondary">Browse events</Link>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { name: "POAP",       desc: "Honor system, anyone can claim without proof", ok: false },
                  { name: "EventBrite", desc: "Centralized, single point of failure",           ok: false },
                  { name: "Presnce",    desc: "AI-verified, on-chain, tamper-proof certificates", ok: true },
                ].map(r => (
                  <div key={r.name} style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "14px 18px", borderRadius: 12,
                    background: r.ok ? "rgba(255,255,255,.9)" : "rgba(255,255,255,.5)",
                    border: `1.5px solid ${r.ok ? "var(--teal)" : "var(--ink-6)"}`,
                  }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                      background: r.ok ? "var(--teal)" : "var(--ink-5)",
                    }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: r.ok ? "var(--ink)" : "var(--ink-3)" }}>{r.name}</div>
                      <div style={{ fontSize: 12, color: "var(--ink-4)", marginTop: 1 }}>{r.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer style={{ borderTop: "1px solid var(--ink-6)", padding: "20px 24px" }}>
        <div style={{
          maxWidth: 1100, margin: "0 auto",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          fontSize: 12, color: "var(--ink-4)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FingerprintLogo size={16} />
            <span style={{ fontWeight: 700, color: "var(--ink-3)", letterSpacing: "-.01em" }}>Presnce</span>
          </div>
          <span style={{ fontFamily: "'JetBrains Mono',monospace" }}>Built on GenLayer</span>
        </div>
      </footer>
    </div>
  );
}

"use client";
import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { TxStatus } from "@/components/TxStatus";
import { useWallet } from "@/hooks/useWallet";
import { useOrganizer } from "@/hooks/useContract";
import { toWei } from "@/lib/genlayer";

const VERIFY_FEE = "0.02";
type TxState = { status: "idle"|"pending"|"success"|"error"; hash?: string; message?: string; approved?: boolean; confidence?: number; reason?: string; };

export default function ApplyVerifiedPage() {
  const { address, isConnected, connect, writeContract } = useWallet();
  const { organizer, refetch } = useOrganizer(address);
  const [profileUrl, setProfileUrl] = useState("");
  const [tx, setTx]   = useState<TxState>({ status: "idle" });
  const [resolving, setResolving] = useState(false);

  const valid = profileUrl.trim().length >= 8;
  const pending = tx.status === "pending" || resolving;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isConnected || !address) { connect(); return; }
    if (!valid) return;

    setTx({ status: "pending", message: "Submitting profile for AI verification..." });
    try {
      const { txHash, timedOut } = await writeContract(
        "apply_verified_organizer",
        [profileUrl],
        toWei(VERIFY_FEE)
      );
      setTx({
        status:  timedOut ? "pending" : "success",
        hash:    txHash,
        message: timedOut
          ? "Submitted. AI validators are reviewing your profile (30-90s)..."
          : "Verification complete! Check your organizer status.",
      });
      setResolving(true);
      // Poll for organizer profile update
      let attempts = 0;
      while (attempts < 12) {
        await new Promise(r => setTimeout(r, 5000));
        await refetch();
        attempts++;
      }
      setResolving(false);
    } catch (err: any) {
      setResolving(false);
      setTx({ status: "error", message: err?.message || "Transaction failed" });
    }
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <Navbar />
      <main className="flex-1 px-4 sm:px-6 py-10 max-w-2xl mx-auto w-full">
        <div className="mb-8 animate-fade-up">
          <p className="section-label mb-3">Organizer verification</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink-50 mb-2">Apply for Verified badge</h1>
          <p className="text-sm text-ink-300">
            AI validators check your online presence. Fee: <span className="font-mono text-violet-light">{VERIFY_FEE} GEN</span>
          </p>
        </div>

        {/* Current status */}
        {organizer && (
          <div className={`card p-4 mb-6 animate-fade-up ${organizer.is_verified ? "border-sage/30 bg-sage/5" : "border-amber/30 bg-amber/5"}`}>
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full ${organizer.is_verified ? "bg-sage-light" : "bg-amber"}`} />
              <p className="text-xs font-mono uppercase tracking-wider">
                {organizer.is_verified ? "Verified organizer" : "Unverified organizer"}
              </p>
            </div>
            <p className="text-xs text-ink-400">
              {organizer.event_count} events created
              {organizer.profile_url && ` · ${organizer.profile_url}`}
            </p>
          </div>
        )}

        {/* Pending */}
        {pending && (
          <div className="mb-6 border border-violet/30 bg-violet/5 rounded-sm p-5 animate-fade-up">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-2 h-2 rounded-full bg-violet-light animate-pulse" />
              <p className="text-sm font-medium text-violet-light">
                {resolving ? "AI validators reviewing profile..." : "Submitting..."}
              </p>
            </div>
            <div className="grid grid-cols-5 gap-1.5 mb-2">
              {[0,1,2,3,4].map(i => (
                <div key={i} className="h-1 bg-violet/20 overflow-hidden">
                  <div className="h-full bg-violet animate-pulse"
                    style={{ animationDelay: `${i * 150}ms`, animationDuration: "1.4s" }} />
                </div>
              ))}
            </div>
            <p className="text-xs text-ink-400">
              5 validators independently verify your profile. This takes 30–90 seconds.
            </p>
          </div>
        )}

        <form onSubmit={submit} className={`space-y-5 animate-fade-up delay-100 ${pending ? "opacity-50 pointer-events-none" : ""}`}>
          <div>
            <label className="block text-xs font-mono text-ink-400 mb-2 uppercase tracking-wider">
              Profile URL *
            </label>
            <input type="url" className="input-field"
              placeholder="https://twitter.com/yourhandle or https://yourwebsite.com"
              value={profileUrl} onChange={e => setProfileUrl(e.target.value)} required />
            <p className="mt-1 text-xs text-ink-500">
              A public URL where AI can verify your identity — Twitter/X, LinkedIn, personal website, or event portfolio.
            </p>
          </div>

          <div className="card p-4 space-y-2">
            <p className="section-label mb-2">What AI checks</p>
            {[
              "Fetches your profile URL from the internet",
              "Checks for real identity: name, bio, event history",
              "Verifies credible online presence (followers, portfolio, website)",
              "Approved → Verified badge on all your events",
              "Rejected → fee forfeited, try again with a better URL",
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="font-mono text-xs text-violet/50 mt-0.5 shrink-0">{String(i+1).padStart(2,"0")}</span>
                <p className="text-xs text-ink-300">{s}</p>
              </div>
            ))}
          </div>

          <div className="card p-4">
            <p className="section-label mb-2">Benefits of verified badge</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { icon: "✓", text: "Verified badge on all events" },
                { icon: "✓", text: "Higher trust from attendees" },
                { icon: "✓", text: "Shown first in search results" },
                { icon: "✓", text: "\"Verified only\" filter visible" },
              ].map((b, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sage-light text-xs">{b.icon}</span>
                  <p className="text-xs text-ink-300">{b.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-4 flex items-start gap-3">
            <div className="w-1 h-1 rounded-full bg-violet mt-2 shrink-0 animate-pulse" />
            <p className="text-xs text-ink-300 leading-relaxed">
              Fee: <span className="font-mono text-violet-light">{VERIFY_FEE} GEN</span> (non-refundable).
              AI decision is final and stored on-chain.
            </p>
          </div>

          <button type="submit" className="btn-primary w-full py-3.5 text-base" disabled={pending || !valid}>
            {pending
              ? <><div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />Verifying...</>
              : !isConnected ? "Connect MetaMask"
              : <>Apply for Verified badge <span className="font-mono opacity-70">{VERIFY_FEE} GEN</span></>}
          </button>

          <TxStatus {...tx} />
        </form>
      </main>
    </div>
  );
}

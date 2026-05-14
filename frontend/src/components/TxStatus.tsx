"use client";

interface TxStatusProps {
  status:   "idle" | "pending" | "success" | "error";
  hash?:    string;
  message?: string;
}

export function TxStatus({ status, hash, message }: TxStatusProps) {
  if (status === "idle") return null;

  const styles = {
    pending: { bg: "#FFFBEB", border: "#FDE68A", color: "#92400E", dot: "#F59E0B" },
    success: { bg: "#F0FDFA", border: "#99F6E4", color: "#065F46", dot: "#10B981" },
    error:   { bg: "#FEF2F2", border: "#FECACA", color: "#991B1B", dot: "#EF4444" },
    idle:    { bg: "", border: "", color: "", dot: "" },
  }[status];

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      padding: "14px 16px", borderRadius: 12,
      background: styles.bg, border: `1.5px solid ${styles.border}`,
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: "50%",
        background: styles.dot, flexShrink: 0, marginTop: 4,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {message && (
          <p style={{ fontSize: 13, color: styles.color, lineHeight: 1.6, margin: 0 }}>
            {message}
          </p>
        )}
        {hash && (
          <a href={`https://explorer-studio.genlayer.com/tx/${hash}`}
            target="_blank" rel="noopener noreferrer"
            style={{
              display: "block", marginTop: 5,
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: 11, color: "var(--ink-4)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
            {hash}
          </a>
        )}
      </div>
    </div>
  );
}

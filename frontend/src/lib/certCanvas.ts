import type { AttendanceCertificate } from "@/types";
import { displayName } from "@/hooks/useNickname";
import { formatDate } from "./utils";

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number, y: number,
  maxWidth: number, lineHeight: number,
  maxLines = 2
) {
  const words = text.split(" ");
  let line = "";
  let cy = y;
  let n = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line + words[i] + " ";
    if (ctx.measureText(test).width > maxWidth && i > 0) {
      if (n >= maxLines - 1) { ctx.fillText(line.trim() + "…", x, cy); return; }
      ctx.fillText(line, x, cy);
      line = words[i] + " ";
      cy += lineHeight;
      n++;
    } else line = test;
  }
  ctx.fillText(line.trim(), x, cy);
}

export async function generateCertImage(cert: AttendanceCertificate): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width  = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext("2d")!;

  // Background
  const bg = ctx.createLinearGradient(0, 0, 1200, 630);
  bg.addColorStop(0, "#F0FDFA");
  bg.addColorStop(1, "#EEF2FF");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1200, 630);

  // Top strip
  const strip = ctx.createLinearGradient(0, 0, 1200, 0);
  strip.addColorStop(0, "#0D9488");
  strip.addColorStop(1, "#6366F1");
  ctx.fillStyle = strip;
  ctx.fillRect(0, 0, 1200, 8);

  // White card
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, 60, 60, 1080, 510, 16);
  ctx.fill();
  ctx.strokeStyle = "#E5E7EB";
  ctx.lineWidth = 1;
  roundRect(ctx, 60, 60, 1080, 510, 16);
  ctx.stroke();

  // Fingerprint watermark (top-right decorative)
  drawFingerprint(ctx, 980, 140, 80, "rgba(13,148,136,0.06)");

  // Label
  ctx.fillStyle = "#0D9488";
  ctx.font = 'bold 13px Arial, sans-serif';
  ctx.letterSpacing = "2px";
  ctx.fillText("ON-CHAIN ATTENDANCE CERTIFICATE", 100, 130);
  ctx.letterSpacing = "0px";

  // Token ID
  ctx.fillStyle = "#6366F1";
  ctx.font = 'bold 96px "Courier New", monospace';
  ctx.fillText(`#${String(cert.token_id).padStart(4, "0")}`, 100, 245);

  // Confidence (right)
  ctx.textAlign = "right";
  ctx.fillStyle = "#9CA3AF";
  ctx.font = 'bold 13px Arial, sans-serif';
  ctx.letterSpacing = "2px";
  ctx.fillText("AI CONFIDENCE", 1100, 130);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = "#0D9488";
  ctx.font = 'bold 96px "Courier New", monospace';
  ctx.fillText(`${cert.confidence}%`, 1100, 245);
  ctx.textAlign = "left";

  // Divider
  ctx.strokeStyle = "#F3F4F6";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(100, 270); ctx.lineTo(1100, 270);
  ctx.stroke();

  // Event name
  ctx.fillStyle = "#111827";
  ctx.font = 'bold 38px Arial, sans-serif';
  wrapText(ctx, cert.event_name, 100, 320, 1000, 46, 2);

  // Details grid
  const cols = [
    { label: "DATE",     value: formatDate(cert.event_date),              x: 100 },
    { label: "LOCATION", value: cert.event_location.slice(0, 25),        x: 420 },
    { label: "OWNER",    value: displayName(cert.owner).slice(0, 20),    x: 800 },
  ];
  cols.forEach(col => {
    ctx.fillStyle = "#9CA3AF";
    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.letterSpacing = "1.5px";
    ctx.fillText(col.label, col.x, 455);
    ctx.letterSpacing = "0px";
    ctx.fillStyle = "#374151";
    ctx.font = '18px "Courier New", monospace';
    ctx.fillText(col.value, col.x, 482);
  });

  // Footer
  ctx.strokeStyle = "#F3F4F6";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(100, 520); ctx.lineTo(1100, 520);
  ctx.stroke();

  ctx.fillStyle = "#9CA3AF";
  ctx.font = '12px "Courier New", monospace';
  ctx.fillText("Presnce · Built on GenLayer Studionet", 100, 545);
  ctx.textAlign = "right";
  ctx.fillText("presnce.vercel.app", 1100, 545);

  return new Promise(resolve =>
    canvas.toBlob(b => resolve(b!), "image/png", 0.95)
  );
}

export async function downloadCertImage(cert: AttendanceCertificate) {
  const blob = await generateCertImage(cert);
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `presnce-cert-${String(cert.token_id).padStart(4,"0")}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function buildXShareUrl(cert: AttendanceCertificate): string {
  const text =
    `Just got my on-chain attendance certificate for "${cert.event_name}"!\n\n` +
    `✓ Verified by AI with ${cert.confidence}% confidence\n` +
    `✓ Minted on @GenLayer\n\n` +
    `#Presnce #GenLayer #Web3`;
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

// ── Canvas helpers ─────────────────────────────────────────────
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawFingerprint(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, size: number, color: string
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  const arcs = [
    { r: size * 0.25, sa: Math.PI * 0.3, ea: Math.PI * 1.2 },
    { r: size * 0.40, sa: Math.PI * 0.2, ea: Math.PI * 1.1 },
    { r: size * 0.55, sa: Math.PI * 0.15, ea: Math.PI * 1.0 },
    { r: size * 0.70, sa: Math.PI * 0.1,  ea: Math.PI * 0.9 },
    { r: size * 0.85, sa: Math.PI * 0.05, ea: Math.PI * 0.8 },
    { r: size * 1.00, sa: Math.PI * 0.0,  ea: Math.PI * 0.7 },
  ];
  arcs.forEach(a => {
    ctx.beginPath();
    ctx.arc(cx, cy, a.r, a.sa, a.ea);
    ctx.stroke();
  });
}

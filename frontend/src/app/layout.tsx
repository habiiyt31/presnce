import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Presnce",
  description: "Prove you were there. AI validators verify attendance on GenLayer and issue tamper-proof on-chain certificates.",
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' fill='none'%3E%3Crect width='32' height='32' rx='8' fill='%230D9488'/%3E%3Cpath d='M16 5C9.37 5 4 10.37 4 17' stroke='white' stroke-width='2.2' stroke-linecap='round'/%3E%3Cpath d='M16 8.5C11.25 8.5 7.5 12.25 7.5 17' stroke='white' stroke-width='2.2' stroke-linecap='round'/%3E%3Cpath d='M16 12c-2.76 0-5 2.24-5 5 0 1.1.35 2.1.95 2.9' stroke='white' stroke-width='2.2' stroke-linecap='round'/%3E%3Cpath d='M16 12c2.76 0 5 2.24 5 5v2.5' stroke='white' stroke-width='2.2' stroke-linecap='round'/%3E%3Cpath d='M11 17v4.5' stroke='white' stroke-width='2.2' stroke-linecap='round'/%3E%3Cpath d='M21 19.5c0 2.5-1.2 4.8-3 6.2' stroke='white' stroke-width='2.2' stroke-linecap='round'/%3E%3Cpath d='M11 21.5c.6 2 2 3.7 3.8 4.7' stroke='white' stroke-width='2.2' stroke-linecap='round'/%3E%3Cpath d='M16 5c6.63 0 12 5.37 12 12 0 2.1-.54 4.07-1.5 5.77' stroke='white' stroke-width='2.2' stroke-linecap='round'/%3E%3Cpath d='M25 24.5c-1.4 2-3.4 3.5-5.7 4.2' stroke='white' stroke-width='2.2' stroke-linecap='round'/%3E%3C/svg%3E",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0D9488",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
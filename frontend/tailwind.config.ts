import type { Config } from "tailwindcss";
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        teal:   { DEFAULT: "#0D9488", light: "#14B8A6", dim: "#0F766E", bg: "#F0FDFA" },
        indigo: { DEFAULT: "#6366F1", light: "#818CF8", bg: "#EEF2FF" },
        ink: {
          DEFAULT: "#111827", 2: "#374151", 3: "#6B7280",
          4: "#9CA3AF", 5: "#D1D5DB", 6: "#E5E7EB", 7: "#F3F4F6", 8: "#F9FAFB",
        },
        surface: "#FFFFFF",
        bg:      "#F8F9FA",
      },
      fontFamily: {
        sans:  ["Inter","DM Sans","system-ui","sans-serif"],
        mono:  ["JetBrains Mono","DM Mono","monospace"],
      },
      borderRadius: {
        sm: "6px", DEFAULT: "10px", md: "12px", lg: "14px", xl: "18px",
      },
      boxShadow: {
        sm:  "0 1px 2px rgba(0,0,0,.05)",
        DEFAULT: "0 1px 3px rgba(0,0,0,.08),0 1px 2px rgba(0,0,0,.04)",
        md:  "0 4px 6px rgba(0,0,0,.06),0 2px 4px rgba(0,0,0,.04)",
        teal:"0 4px 12px rgba(13,148,136,.3)",
      },
    },
  },
  plugins: [],
};
export default config;

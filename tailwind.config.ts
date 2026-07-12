import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#0c0c10",
          raised: "#111116",
          overlay: "#16161d",
          hover: "#1a1a22",
          border: "#22222e",
          "border-subtle": "#1a1a24",
        },
        accent: {
          DEFAULT: "#3b82f6",
          muted: "#2563eb",
          glow: "rgba(59, 130, 246, 0.15)",
        },
        gain: {
          DEFAULT: "#22c55e",
          muted: "#16a34a",
          bg: "rgba(34, 197, 94, 0.1)",
        },
        loss: {
          DEFAULT: "#ef4444",
          muted: "#dc2626",
          bg: "rgba(239, 68, 68, 0.1)",
        },
        text: {
          primary: "#f4f4f5",
          secondary: "#a1a1aa",
          muted: "#71717a",
          faint: "#52525b",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 0 0 1px rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.4)",
        glow: "0 0 20px rgba(59, 130, 246, 0.15)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in-up": "fadeInUp 0.45s ease-out both",
        "terminal-scan": "terminalScan 4s ease-in-out infinite",
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        terminalScan: {
          "0%, 100%": { opacity: "0", transform: "translateX(-35%)" },
          "15%, 75%": { opacity: "1" },
          "90%": { opacity: "0", transform: "translateX(35%)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

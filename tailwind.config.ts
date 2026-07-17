import type { Config } from "tailwindcss";

/**
 * Tailwind semantic tokens resolve through CSS variables written by the
 * EquityOS ThemeEngine (src/design/theme/ThemeEngine.ts). Colors are RGB
 * triplets so opacity modifiers (e.g. bg-accent/20) work in every theme.
 * Defaults for SSR live in styles/globals.css (:root).
 */
const themeColor = (token: string) => `rgb(var(--eos-color-${token}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: themeColor("primary"),
        secondary: themeColor("secondary"),
        surface: {
          DEFAULT: themeColor("background"),
          raised: themeColor("surface"),
          overlay: themeColor("card"),
          hover: themeColor("surface-hover"),
          border: themeColor("border"),
          "border-subtle": themeColor("border-subtle"),
        },
        card: themeColor("card"),
        muted: themeColor("muted"),
        accent: {
          DEFAULT: themeColor("accent"),
          muted: themeColor("accent-muted"),
          glow: "rgb(var(--eos-color-accent) / 0.15)",
        },
        gain: {
          DEFAULT: themeColor("success"),
          muted: themeColor("success-muted"),
          bg: "rgb(var(--eos-color-success) / 0.1)",
        },
        loss: {
          DEFAULT: themeColor("danger"),
          muted: themeColor("danger-muted"),
          bg: "rgb(var(--eos-color-danger) / 0.1)",
        },
        warning: themeColor("warning"),
        info: themeColor("info"),
        text: {
          primary: themeColor("text-primary"),
          secondary: themeColor("text-secondary"),
          muted: themeColor("text-muted"),
          faint: themeColor("text-faint"),
        },
      },
      screens: {
        // Ultra-wide breakpoint from src/design/theme/breakpoints.ts
        "3xl": "1920px",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "var(--eos-shadow-card)",
        floating: "var(--eos-shadow-floating)",
        overlay: "var(--eos-shadow-overlay)",
        popup: "var(--eos-shadow-popup)",
        dropdown: "var(--eos-shadow-dropdown)",
        glass: "var(--eos-shadow-glass)",
        glow: "0 0 20px rgb(var(--eos-color-accent) / 0.15)",
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

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
        "fade-in": "fadeIn 0.2s ease-out both",
        "scale-in": "scaleIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "slide-in": "slideIn 0.32s cubic-bezier(0, 0, 0.2, 1) both",
        "terminal-scan": "terminalScan 4s ease-in-out infinite",
        "confidence-fill": "confidenceFill 0.8s ease-out both",
        shimmer: "shimmer 1.8s linear infinite",
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateX(16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        terminalScan: {
          "0%, 100%": { opacity: "0", transform: "translateX(-35%)" },
          "15%, 75%": { opacity: "1" },
          "90%": { opacity: "0", transform: "translateX(35%)" },
        },
        confidenceFill: {
          "0%": { transform: "scaleX(0)", transformOrigin: "left" },
          "100%": { transform: "scaleX(1)", transformOrigin: "left" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

import type { Config } from "tailwindcss";

export default {
  // lib/ renders JSX too (markdown.tsx) — without it those classes get purged.
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // The console is tuned for 1340px; these are the two points where it
      // steps down (panels stack, then the hero reactor drops out).
      screens: { mid: "900px", wide: "1180px" },
      fontFamily: {
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        display: ['"Space Grotesk"', '"Inter"', "sans-serif"],
      },
      colors: {
        brand: { DEFAULT: "var(--brand)", 2: "var(--brand-2)", ink: "var(--brand-ink)" },
        ink: {
          DEFAULT: "var(--ink)",
          2: "var(--ink-2)",
          muted: "var(--ink-muted)",
          faint: "var(--ink-faint)",
          ghost: "var(--ink-ghost)",
        },
        line: {
          DEFAULT: "var(--line)",
          2: "var(--line-2)",
          3: "var(--line-3)",
          strong: "var(--line-strong)",
        },
        surface: {
          DEFAULT: "var(--surface)",
          soft: "var(--surface-soft)",
          strong: "var(--surface-strong)",
        },
      },
      keyframes: {
        flash: {
          "0%": { backgroundColor: "rgba(79,140,255,0.16)" },
          "100%": { backgroundColor: "transparent" },
        },
      },
      animation: {
        flash: "flash 1s ease-out",
      },
    },
  },
  plugins: [],
} satisfies Config;

import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      keyframes: {
        flash: {
          "0%": { backgroundColor: "rgb(59 130 246 / 0.18)" },
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

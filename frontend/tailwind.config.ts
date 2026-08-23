import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0B0F14",
        surface: "#12181F",
        "surface-raised": "#171E27",
        line: "#232C36",
        "line-soft": "#1A222B",
        text: {
          primary: "#E6EAEE",
          muted: "#8A96A3",
          faint: "#5B6673",
        },
        pulse: {
          DEFAULT: "#6366F1",
          soft: "#6366F122",
          bright: "#818CF8",
        },
        signal: {
          success: "#22C55E",
          warning: "#F59E0B",
          critical: "#EF4444",
          info: "#38BDF8",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(0,0,0,0.4), 0 0 0 1px rgba(35,44,54,0.6)",
      },
      animation: {
        "pulse-line": "pulse-line 2.4s ease-in-out infinite",
      },
      keyframes: {
        "pulse-line": {
          "0%, 100%": { strokeDashoffset: "0" },
          "50%": { strokeDashoffset: "-40" },
        },
      },
    },
  },
  plugins: [],
};
export default config;

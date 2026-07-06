import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        grimoire: {
          bg: "#0a0612",
          elevated: "#140e24",
          surface: "#1e1535",
          border: "#2a1f4e",
          purple: "#8b5cf6",
          "purple-light": "#a78bfa",
          "purple-deep": "#4c1d95",
          gold: "#c9a84c",
          "gold-light": "#e2c97e",
          ember: "#ff6b35",
          teal: "#4ecdc4",
          crimson: "#dc2626",
          ink: "#d4c5a9",
          muted: "#6b6280",
        },
        ritual: {
          black: "#000000",
          elevated: "#111827",
          surface: "#1F2937",
          green: "#19D184",
          lime: "#BFFF00",
          pink: "#FF1DCE",
          gold: "#FACC15",
          red: "#EF4444",
        },
      },
      fontFamily: {
        display: ["'Cinzel'", "var(--font-display)", "serif"],
        body: ["'Crimson Text'", "var(--font-body)", "Georgia", "serif"],
        sans: ["'Barlow'", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "'JetBrains Mono'", "monospace"],
      },
      boxShadow: {
        "glow-purple": "0 0 30px -5px rgba(139, 92, 246, 0.3)",
        "glow-gold": "0 0 30px -5px rgba(201, 168, 76, 0.3)",
        "glow-ember": "0 0 30px -5px rgba(255, 107, 53, 0.25)",
        "glow-teal": "0 0 20px -5px rgba(78, 205, 196, 0.25)",
        card: "0 4px 40px -12px rgba(0, 0, 0, 0.6)",
        "card-hover": "0 8px 50px -10px rgba(139, 92, 246, 0.2)",
      },
      animation: {
        "pulse-gold": "pulse-gold 2.5s ease-in-out infinite",
        "rune-glow": "rune-glow 3s ease-in-out infinite",
        float: "float 4s ease-in-out infinite",
        "fade-in": "fade-in 0.5s ease-out both",
        "fade-in-up": "fade-in-up 0.6s ease-out both",
        shimmer: "shimmer 2s linear infinite",
        "spin-slow": "spin 12s linear infinite",
        "ink-spread": "ink-spread 0.8s ease-out both",
        "page-turn": "page-turn 0.6s ease-in-out",
        typewriter: "typewriter 0.05s steps(1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;

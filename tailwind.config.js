/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        bg: {
          DEFAULT: "#0a0e1a",
          subtle: "#0d1420",
          elevated: "#111827",
          hover: "#1a2332",
        },
        line: {
          DEFAULT: "#1f2937",
          strong: "#2d3748",
        },
        ink: {
          DEFAULT: "#f1f5f9",
          soft: "#94a3b8",
          mute: "#64748b",
          faint: "#475569",
        },
        accent: {
          DEFAULT: "#06b6d4",
          soft: "#0e7490",
          glow: "rgba(6, 182, 212, 0.15)",
        },
        ok: "#10b981",
        warn: "#f59e0b",
        err: "#ef4444",
        info: "#3b82f6",
      },
      fontSize: {
        "2xs": ["10px", "14px"],
        "xs": ["11px", "16px"],
        "sm": ["12px", "18px"],
        "base": ["13px", "20px"],
        "md": ["14px", "22px"],
        "lg": ["16px", "24px"],
        "xl": ["20px", "28px"],
        "2xl": ["24px", "32px"],
        "3xl": ["32px", "40px"],
      },
      animation: {
        "pulse-soft": "pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
    },
  },
  plugins: [],
};
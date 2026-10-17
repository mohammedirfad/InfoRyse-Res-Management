import type { Config } from "tailwindcss";

const config: Config = {
  // Include ALL paths — route groups use (auth) and (panel) folder names
  content: [
    "./src/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Super Admin — cool navy/blue SaaS palette
        navy: {
          DEFAULT: "#0B1736",
          light: "#13234F",
          accent: "#3B82F6",
        },
        // Restaurant Admin — warm hospitality, dark green + gold ("Kpe" style)
        forest: {
          DEFAULT: "#132A1E",
          light: "#1C3C29",
          accent: "#D4A94C",
        },
        // Customer app — warm neutral, terracotta accent
        warm: {
          bg: "#FBF7F1",
          card: "#FFFFFF",
          accent: "#C2572B",
        },
      },
      fontFamily: {
        display: ["Georgia", "serif"],
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
      keyframes: {
        "slide-up": {
          "0%": { transform: "translateY(16px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "slide-in-right": {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "pop": {
          "0%": { transform: "scale(0.85)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "pulse-ring": {
          "0%":   { transform: "scale(0.9)", opacity: "0.7" },
          "50%":  { transform: "scale(1.05)", opacity: "1" },
          "100%": { transform: "scale(0.9)", opacity: "0.7" },
        },
      },
      animation: {
        "slide-up": "slide-up 0.25s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "pop": "pop 0.25s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "pulse-ring": "pulse-ring 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;

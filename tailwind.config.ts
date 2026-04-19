import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./types/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        border: "#d7dce4",
        background: "#f4f6f8",
        foreground: "#0f1720",
        muted: "#667085",
        card: "#ffffff",
        accent: "#0f766e",
        accentSoft: "#e6f5f3",
        danger: "#b42318",
        warning: "#b54708"
      },
      borderRadius: {
        xl: "1rem"
      },
      boxShadow: {
        soft: "0 18px 50px -26px rgba(15, 23, 32, 0.35)"
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;

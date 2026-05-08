import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Pretendard", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        polar: {
          bg: "#f7f2ea",
          panel: "#fffdf8",
          panelSoft: "#f0e7da",
          cyan: "#2f6f73",
          violet: "#6f5b8f",
          lime: "#8b9d4a",
          text: "#211f1b",
          muted: "#706a60",
          line: "#dfd3c3",
          coral: "#c76f51",
          ochre: "#c99b3b",
        },
      },
      boxShadow: {
        neon: "0 18px 45px rgba(84, 63, 35, 0.09)",
        violet: "0 18px 40px rgba(111, 91, 143, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;

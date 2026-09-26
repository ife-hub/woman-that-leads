import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#000000",
        char: "#121212",
        smoke: "#8a8a8a",
        cream: "#ffffff",
        gold: "#e8e8e8",
        "gold-dim": "#a3a3a3",
        rust: "#ff5a5a",
      },
      fontFamily: {
        brush: ["var(--font-brush)"],
        hand: ["var(--font-hand)"],
        body: ["var(--font-body)"],
      },
      backgroundImage: {
        grain: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)",
      },
    },
  },
  plugins: [],
};
export default config;
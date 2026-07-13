import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        poly: {
          bg: "#1a1a2e",
          card: "#16213e",
          accent: "#0f3460",
          highlight: "#e94560",
          green: "#00c853",
          red: "#ff1744",
          text: "#eaeaea",
          muted: "#8892b0",
          border: "#233554",
        },
      },
    },
  },
  plugins: [],
};
export default config;

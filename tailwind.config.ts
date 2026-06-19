import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        pitch: "#0f7a53",
        ink: "#101828",
        paper: "#f8fafc"
      },
      boxShadow: {
        glow: "0 16px 50px rgba(16, 24, 40, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;

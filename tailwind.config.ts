import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        aubergine: "#2B193D",
        mauve: "#6E4B7E",
        witness: "#F4D8E8",
        cream: "#FFF7EA",
        sand: "#E8D8B8",
        walnut: "#6B4E3D",
        teal: "#2A9D8F",
        keeper: "#3A86FF",
        action: "#2FBF71",
        marigold: "#FFB703",
        dispute: "#E63946",
        ink: "#1F1F24",
        mist: "#D9C7D8",
      },
      fontFamily: {
        prata: ["var(--font-prata)", "serif"],
        nunito: ["var(--font-nunito)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;

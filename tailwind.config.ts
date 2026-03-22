import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#000000",
        foreground: "#F0F0F0",
        surface: "#0D0D0D",
        border: "#1A1A1A",
        accent: "#00FFA3",
        purple: "#7B61FF",
        danger: "#FF4D4D",
        amber: "#FFB800",
        muted: "#666666",
      },
      fontFamily: {
        grotesk: ["Space Grotesk", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      transitionDuration: {
        '250': '250ms',
      },
    },
  },
  plugins: [],
};
export default config;

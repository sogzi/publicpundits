import type { Config } from "tailwindcss";

const config: Config = {
  // Light mode only — no dark: variants used anywhere in this project
  darkMode: "class",   // "class" strategy means dark mode only activates with a .dark class on <html>, which we never add
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
export default config;

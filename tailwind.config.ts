import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cerca: {
          50: "#eefdf8",
          100: "#d6f8ed",
          500: "#15b981",
          600: "#0d9268",
          900: "#064633"
        }
      }
    }
  },
  plugins: []
};
export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          50: "#f0f9fa",
          100: "#d5f0f3",
          200: "#b0e2e8",
          300: "#7bcdd8",
          400: "#3fb0c2",
          500: "#0d9488",
          600: "#005967",
          700: "#004854",
          800: "#003842",
          900: "#002931",
          950: "#00171d",
        },
        warm: {
          50: "#faf8f5",
          100: "#f5f0eb",
          200: "#e8dfd5",
          300: "#d6c5b4",
          400: "#bfa38c",
          500: "#ab856a",
          600: "#966f54",
          700: "#7c5943",
          800: "#654a3a",
          900: "#533e32",
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      animation: {
        "pulse-subtle": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "flash": "flash 150ms ease-out",
      },
      keyframes: {
        flash: {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        }
      }
    },
  },
  plugins: [],
};
export default config;

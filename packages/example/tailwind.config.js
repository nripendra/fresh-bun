/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./routes/**/*.{ts,tsx}",
    "./client/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  safelist: [{ pattern: /(alert)-./ }],
  plugins: [require("daisyui")],
};

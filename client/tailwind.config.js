/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        uno: {
          red: "#ed1c24",
          yellow: "#ffde00",
          green: "#00a651",
          blue: "#009fe3",
          black: "#111111",
        },
        table: {
          felt: "#0b5c32",
          feltDark: "#08301f",
          rim: "#8b5a2b",
        },
      },
      boxShadow: {
        card: "0 8px 0 rgba(0,0,0,0.35), 0 12px 24px rgba(0,0,0,0.35)",
        glow: "0 0 24px rgba(255, 222, 0, 0.55)",
      },
      fontFamily: {
        display: ["Lilita One", "Impact", "sans-serif"],
        sans: ["Nunito", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};

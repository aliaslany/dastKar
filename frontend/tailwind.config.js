/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        parchment: "#F3ECDC",
        ink: "#2E2115",
        firouzeh: {
          DEFAULT: "#0F7A7E",
          dark: "#0A5457",
          light: "#E4F1F1",
        },
        saffron: {
          DEFAULT: "#C98A2C",
          dark: "#9C6A1F",
          light: "#F6E7C9",
        },
        madder: "#A13D2B",
      },
      fontFamily: {
        vazir: ["Vazirmatn", "Tahoma", "sans-serif"],
      },
      backgroundImage: {
        girih: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cpath d='M20 0L40 20L20 40L0 20Z' fill='none' stroke='%230F7A7E' stroke-opacity='0.15' stroke-width='1'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};

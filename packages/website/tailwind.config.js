/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,ts}"],
  theme: {
    extend: {
      fontFamily: {
        inter: ["Inter", "sans-serif"],
        volkhov: ['Volkhov', 'serif'],
      },
      colors: {
        green: "var(--green)",
        yellow: "var(--yellow)",
        white: "var(--white)",
        "dark-green": "var(--dark-green)",
      }
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "neon-pink": "#FF00FF",
        "neon-lime": "#00FF00",
        "neon-blue": "#00FFFF",
        "brand-bg": "#F0F0F0",
        "brand-dark": "#111111",
      },
      fontFamily: {
        display: ["Anton", "sans-serif"],
        mono: ["Space Mono", "monospace"],
      },
      boxShadow: {
        hard: "4px 4px 0px #111111",
        "hard-sm": "2px 2px 0px #111111",
        "hard-pink": "5px 5px 0px #FF00FF",
        "hard-blue": "5px 5px 0px #00FFFF",
        "hard-lime": "5px 5px 0px #00FF00",
      },
      animation: {
        marquee: "marquee 20s linear infinite",
        "float-1": "float-1 15s ease-in-out infinite",
        "float-2": "float-2 12s ease-in-out infinite",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-100%)" },
        },
        "float-1": {
          "0%, 100%": {
            transform:
              "translateY(0px) translateX(0px) rotate(0deg)",
          },
          "25%": {
            transform:
              "translateY(-20px) translateX(10px) rotate(5deg)",
          },
          "50%": {
            transform:
              "translateY(0px) translateX(20px) rotate(0deg)",
          },
          "75%": {
            transform:
              "translateY(20px) translateX(10px) rotate(-5deg)",
          },
        },
        "float-2": {
          "0%, 100%": { transform: "translateY(0px) rotate(10deg)" },
          "50%": { transform: "translateY(-30px) rotate(-10deg)" },
        },
      },
    },
  },
  plugins: [],
};

import type { Config } from 'tailwindcss'
const defaultTheme = require('tailwindcss/defaultTheme')
const mainColor = "var(--primary-color)";

const getTintedColor = (color: string, intensity: number, mixColor: string = 'white') => {
  return `color-mix(in srgb, ${color}, ${mixColor} ${intensity * 100}%)`
}

const generateTintedColors = (color: string, variants: Record<number, number>, mixColor: string = 'white') => {
  return Object.fromEntries(
    Object.entries(variants).map(([key, value]) => [key, getTintedColor(color, value, mixColor)])
  );
};

export default {
  content: ["./src/**/*.{html,ts}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        // Inter for Latin text; Noto Sans Gujarati covers the Gujarati script.
        'sans': ['"Inter"', '"Noto Sans Gujarati"', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        primary: {
          DEFAULT: mainColor,
          ...generateTintedColors(mainColor, {
            50: 0.95,
            100: 0.9,
            200: 0.7,
            300: 0.5,
            400: 0.3
          }),
          500: mainColor,
          ...generateTintedColors(mainColor, {
            600: 0.1,
            700: 0.3,
            800: 0.5,
            900: 0.7
          }, 'black'),
        },
      },
    },
  },
} satisfies Config

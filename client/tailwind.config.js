/** @type {import('tailwindcss').Config} */
// KilosUnlad visual identity: a civic, paper-and-ink palette (warm paper, navy ink,
// ochre accent) instead of the stock cool greys and saturated blues. Remapping the
// colour scales here restyles every screen without rewriting components.
const paper = { 50: '#faf8f3', 100: '#f4f1e9', 200: '#e6e1d5', 300: '#d2cbbb', 400: '#a8a090', 500: '#7c7566',
  600: '#5f594d', 700: '#48433b', 800: '#312e29', 900: '#1f1d1a', 950: '#13120f' };
const ink = { 50: '#eef2f7', 100: '#dce4ee', 200: '#b9c8db', 300: '#8ea5c2', 400: '#5f7da2', 500: '#3d5c84',
  600: '#284669', 700: '#1b3557', 800: '#13233f', 900: '#0d1a30', 950: '#08111f' };
const forest = { 50: '#eef5f0', 100: '#dceadf', 200: '#b8d4bf', 300: '#8db89a', 400: '#5e9670', 500: '#3f7a53',
  600: '#2e6b4f', 700: '#255a42', 800: '#1e4835', 900: '#173729', 950: '#0e231a' };
const brick = { 50: '#faf0ef', 100: '#f3dedb', 200: '#e7bdb7', 300: '#d6958c', 400: '#c06b60', 500: '#a84e43',
  600: '#933d33', 700: '#7a3029', 800: '#632722', 900: '#4e1f1b', 950: '#2f1210' };
const ochre = { 50: '#fbf5ea', 100: '#f5e8cf', 200: '#ebd1a1', 300: '#ddb46d', 400: '#cf9a45', 500: '#b98030',
  600: '#a4661a', 700: '#855016', 800: '#683f14', 900: '#523212', 950: '#2f1c09' };

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        stone: paper, slate: paper, gray: paper,
        blue: ink, sky: ink, indigo: ink,
        emerald: forest, green: forest,
        rose: brick, red: brick,
        amber: ochre, orange: ochre, yellow: ochre,
        dswd: {
          navy: '#13233f',
          'navy-dark': '#0d1a30',
          blue: '#1b3557',
          red: '#933d33',
          yellow: '#cf9a45',
          gold: '#a4661a',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans Variable"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        serif: ['"Source Serif 4 Variable"', '"Source Serif 4"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono Variable"', '"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      // Flatter, more document-like surfaces: small radii, hairline borders, almost no shadow.
      borderRadius: { sm: '3px', DEFAULT: '4px', md: '5px', lg: '6px', xl: '8px', '2xl': '10px', '3xl': '12px' },
      boxShadow: {
        xs: 'none', sm: 'none', DEFAULT: '0 1px 2px rgba(19, 35, 63, 0.06)', md: '0 1px 3px rgba(19, 35, 63, 0.08)',
        lg: '0 8px 24px rgba(19, 35, 63, 0.10)', xl: '0 12px 32px rgba(19, 35, 63, 0.14)', '2xl': '0 16px 40px rgba(19, 35, 63, 0.18)',
      },
    },
  },
  plugins: [],
}

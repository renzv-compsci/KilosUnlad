/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Official DSWD / Philippine Government branding palette 

        // Can subject to change based on the decsion of frontend
        dswd: {
          navy: '#132e4f',
          'navy-dark': '#0c2340',
          blue: '#0038A8',
          red: '#CE1126',
          yellow: '#FCD116',
          gold: '#b48c36',
        }
      }
    },
  },
  plugins: [],
}

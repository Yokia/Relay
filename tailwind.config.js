/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0f172a',
        surface: '#1e293b',
        surfaceHover: '#334155',
        border: '#334155',
        accent: '#38bdf8',
        accentHover: '#0284c7',
      }
    },
  },
  plugins: [],
}

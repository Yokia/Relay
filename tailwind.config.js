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
        slate: {
          50: 'rgb(var(--color-slate-50) / <alpha-value>)',
          100: 'rgb(var(--color-slate-100) / <alpha-value>)',
          200: 'rgb(var(--color-slate-200) / <alpha-value>)',
          300: 'rgb(var(--color-slate-300) / <alpha-value>)',
          400: 'rgb(var(--color-slate-400) / <alpha-value>)',
          500: 'rgb(var(--color-slate-500) / <alpha-value>)',
          600: 'rgb(var(--color-slate-600) / <alpha-value>)',
          700: 'rgb(var(--color-slate-700) / <alpha-value>)',
          800: 'rgb(var(--color-slate-800) / <alpha-value>)',
          900: 'rgb(var(--color-slate-900) / <alpha-value>)',
          950: 'rgb(var(--color-slate-950) / <alpha-value>)',
        },
        sky: {
          300: 'rgb(var(--color-sky-300) / <alpha-value>)',
          400: 'rgb(var(--color-sky-400) / <alpha-value>)',
        },
        amber: {
          300: 'rgb(var(--color-amber-300) / <alpha-value>)',
          400: 'rgb(var(--color-amber-400) / <alpha-value>)',
        },
        emerald: {
          400: 'rgb(var(--color-emerald-400) / <alpha-value>)',
        },
        rose: {
          400: 'rgb(var(--color-rose-400) / <alpha-value>)',
        },
        blue: {
          400: 'rgb(var(--color-blue-400) / <alpha-value>)',
        },
        purple: {
          400: 'rgb(var(--color-purple-400) / <alpha-value>)',
        },
        cyan: {
          400: 'rgb(var(--color-cyan-400) / <alpha-value>)',
        },
        background: 'rgb(var(--color-slate-950) / <alpha-value>)',
        surface: 'rgb(var(--color-slate-900) / <alpha-value>)',
        surfaceHover: 'rgb(var(--color-slate-800) / <alpha-value>)',
        border: 'rgb(var(--color-slate-800) / <alpha-value>)',
        accent: 'rgb(var(--color-sky-400) / <alpha-value>)',
        accentHover: 'rgb(var(--color-sky-300) / <alpha-value>)',
      }
    },
  },
  plugins: [],
}

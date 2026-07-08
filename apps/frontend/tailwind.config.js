/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary:   { DEFAULT: '#2563EB', dark: '#1D4ED8' },
        secondary: { DEFAULT: '#7C3AED', dark: '#6D28D9' },
        success:   { DEFAULT: '#059669' },
        warning:   { DEFAULT: '#D97706' },
        danger:    { DEFAULT: '#DC2626' },
        surface:   { DEFAULT: '#F8FAFC', card: '#FFFFFF' },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

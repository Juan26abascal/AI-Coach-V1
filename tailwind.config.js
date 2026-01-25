/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './app/components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#1E1C19',
        ash: '#333333',
        slate: '#3B3833',
        smoke: '#313131',
        bronze: '#988F5F',
        sand: '#C1B491',
        stone: '#CFCDBD',
        moss: '#615C40',
        gold: '#B08A44',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['"Cormorant Garamond"', 'ui-serif', 'Georgia', 'serif'],
      },
      boxShadow: {
        soft: '0 12px 40px rgba(0,0,0,0.35)',
        inset: 'inset 0 0 0 1px rgba(255,255,255,0.04)',
      },
    },
  },
  plugins: [],
};

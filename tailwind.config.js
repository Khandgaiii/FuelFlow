/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#F97316',
        danger: '#EF4444',
        warning: '#F59E0B',
        success: '#22C55E',
        card: '#1A1A1A',
      },
      fontFamily: {
        mono: ['Courier New'],
      },
    },
  },
  plugins: [],
};

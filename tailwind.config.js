/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        agro: {
          50: '#F2F9F5',
          100: '#E1F3EA',
          200: '#C2E7D4',
          300: '#94D4B4',
          400: '#5FBC8F',
          500: '#28A76B', // Color oficial del logo Click Agro
          600: '#1E8754',
          700: '#196B44',
          800: '#165538',
          900: '#13462F',
          950: '#09271A',
        },
        earth: {
          50: '#FAF8F5',
          100: '#F3EFE8',
          200: '#E6DDD1',
          500: '#8C7456',
          700: '#5C4A34',
          900: '#382B1C',
        }
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#15201d',
        canvas: '#f4f6f1',
        brand: {
          50: '#eefbf4',
          100: '#d6f5e4',
          500: '#1f9d62',
          600: '#168453',
          700: '#126a44',
          900: '#123d2d'
        },
        amber: '#ffb547'
      },
      boxShadow: {
        card: '0 18px 50px -30px rgba(21, 32, 29, 0.35)'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Georgia', 'Cambria', 'serif']
      }
    }
  },
  plugins: []
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0f',
        surface: {
          DEFAULT: '#121219',
          raised: '#1a1a24',
          hover: '#23232f',
          border: '#2a2a38',
        },
        neon: {
          300: '#dcb0ff',
          400: '#c673ff',
          500: '#b026ff',
          600: '#9100e6',
          700: '#6f00b3',
        },
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out both',
      },
    },
  },
  plugins: [],
};

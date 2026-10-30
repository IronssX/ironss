/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0c0c10',
        surface: {
          DEFAULT: '#131218',
          raised: '#1b1921',
          hover: '#24212b',
          border: '#302b37',
        },
        neon: {
          300: '#cda3f5',
          400: '#bd86ef',
          500: '#a76ce3',
          600: '#8952c4',
          700: '#673b98',
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

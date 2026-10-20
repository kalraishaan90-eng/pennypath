/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#EFE8DF',
          10: 'rgba(239, 232, 223, 0.10)',
          20: 'rgba(239, 232, 223, 0.20)',
          40: 'rgba(239, 232, 223, 0.40)',
        },
        ink: {
          DEFAULT: '#0F414A',
          10: 'rgba(15, 65, 74, 0.10)',
          20: 'rgba(15, 65, 74, 0.20)',
          40: 'rgba(15, 65, 74, 0.40)',
          dark: '#0A2D33',
          light: '#1B5B67',
        },
        accent: {
          DEFAULT: '#7F0303',
          10: 'rgba(127, 3, 3, 0.10)',
          20: 'rgba(127, 3, 3, 0.20)',
          40: 'rgba(127, 3, 3, 0.40)',
          dark: '#600202',
          light: '#A00D0D',
        },
        sand: {
          DEFAULT: '#D8BA98',
          10: 'rgba(216, 186, 152, 0.10)',
          20: 'rgba(216, 186, 152, 0.20)',
          40: 'rgba(216, 186, 152, 0.40)',
          light: '#E6D3BE',
          dark: '#C29D74',
        },
        sky: {
          DEFAULT: '#96C0CE',
          10: 'rgba(150, 192, 206, 0.10)',
          20: 'rgba(150, 192, 206, 0.20)',
          40: 'rgba(150, 192, 206, 0.40)',
          light: '#B6D6E2',
          dark: '#6EA2B3',
        },
      },
      fontFamily: {
        fraunces: ['Fraunces', 'serif'],
        inter: ['Inter', 'sans-serif'],
        hindi: ['"Noto Sans Devanagari"', 'sans-serif'],
        sans: ['Inter', '"Noto Sans Devanagari"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['Fraunces', 'serif'],
      },
      borderRadius: {
        'card': '16px',
        'btn': '12px',
      },
      boxShadow: {
        'card': '0 2px 8px -2px rgba(15, 65, 74, 0.08), 0 1px 4px -1px rgba(15, 65, 74, 0.04)',
        'card-hover': '0 8px 24px -4px rgba(15, 65, 74, 0.12), 0 4px 8px -2px rgba(15, 65, 74, 0.06)',
        'modal': '0 20px 40px -8px rgba(15, 65, 74, 0.24)',
      },
    },
  },
  plugins: [],
}

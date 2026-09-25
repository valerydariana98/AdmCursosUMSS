/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sidebar: {
          bg: '#0C103C',
          active: '#1D3557',
        },
        brand: {
          primary: '#111827',
          accent: '#1E3A8A',
          secondary: '#626C7A',
          bg: '#F8FAFC',
        },
        status: {
          activeBg: '#ECFDF5',
          activeText: '#047857',
          inactiveBg: '#F3F4F6',
          inactiveText: '#626C7A',
          errorBg: '#FEF2F2',
          errorText: '#AB1B1E',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        nunito: ['Nunito', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
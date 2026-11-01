/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563EB',
          light: '#EFF6FF',
          hover: '#1D4ED8',
          border: '#DBEAFE',
        },
        ios: {
          blue: '#007AFF',
          indigo: '#5E5CE6',
          emerald: '#34C759',
          amber: '#FF9500',
          rose: '#FF2D55',
          slate: '#0F172A',
          bg: '#F8FAFC',
          card: 'rgba(255, 255, 255, 0.85)',
          border: 'rgba(226, 232, 240, 0.8)',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"SF Pro Text"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'ios': '0 2px 12px 0 rgba(0, 0, 0, 0.04), 0 1px 3px 0 rgba(0, 0, 0, 0.02)',
        'ios-hover': '0 8px 30px rgba(0, 0, 0, 0.08)',
        'ios-glass': '0 8px 32px 0 rgba(31, 38, 135, 0.05)',
      },
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [],
}

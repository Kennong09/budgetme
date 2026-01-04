/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe', 
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Landing page color palette
        landing: {
          primary: '#6366f1',
          'primary-dark': '#4f46e5',
          'primary-light': '#a5b4fc',
          gray: '#f9fafb',
          'gray-dark': '#6b7280',
          dark: '#1f2937',
          white: '#ffffff',
          accent: '#f59e0b',
          success: '#10b981',
          danger: '#ef4444',
          border: '#e5e7eb',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '128': '32rem',
        '144': '36rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'sidebar': '0 10px 40px -10px rgba(99, 102, 241, 0.15)',
        'sidebar-item': '0 4px 12px rgba(99, 102, 241, 0.15)',
      }
    },
  },
  plugins: [],
}

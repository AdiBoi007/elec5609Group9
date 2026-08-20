/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'rgb(var(--text-primary) / <alpha-value>)',
        canvas: 'rgb(var(--background) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-elevated': 'rgb(var(--surface-elevated) / <alpha-value>)',
        'surface-muted': 'rgb(var(--surface-muted) / <alpha-value>)',
        muted: 'rgb(var(--text-muted) / <alpha-value>)',
        line: 'rgb(var(--border) / <alpha-value>)',
        coral: 'rgb(var(--accent) / <alpha-value>)',
        pulse: 'rgb(var(--accent) / <alpha-value>)',
        violet: 'rgb(var(--ai) / <alpha-value>)',
        sleep: 'rgb(var(--sleep) / <alpha-value>)',
        cyan: 'rgb(var(--water) / <alpha-value>)',
        hydration: 'rgb(var(--water) / <alpha-value>)',
        amber: 'rgb(var(--warning) / <alpha-value>)',
        warning: 'rgb(var(--warning) / <alpha-value>)',
        success: 'rgb(var(--success) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
      },
      borderRadius: {
        card: '22px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(23,23,23,.02), 0 8px 24px rgba(23,23,23,.03)',
      },
      keyframes: {
        'drawer-in': { from: { transform: 'translateX(24px)', opacity: '0' }, to: { transform: 'translateX(0)', opacity: '1' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
      },
      animation: {
        'drawer-in': 'drawer-in 190ms cubic-bezier(.2,.8,.2,1)',
        'fade-in': 'fade-in 160ms ease-out',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"Segoe UI"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nova: {
          green: "#0b6623",
          greenLight: "#10b981",
          gold: "#d4af37",
          goldLight: "#f59e0b",
          bg: "#f8fafc",
          surface: "#ffffff",
          border: "#e2e8f0",
          hover: "#f1f5f9",
          textDark: "#0f172a",
          textMuted: "#64748b",
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 10px rgba(0, 0, 0, 0.04)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)',
      }
    },
  },
  plugins: [],
}

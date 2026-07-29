/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx}', './src/**/*.{js,jsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        panel: '#0d1818',
        surface: '#132323',
        border: '#24413d',
        primary: '#00C896',
        secondary: '#D7B75A',
        medium: '#07100f',
        success: '#12cf7a',
        danger: '#f24d58',
        muted: '#93aaa4',
      },
    },
  },
  plugins: [],
};

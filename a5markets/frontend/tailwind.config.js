/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx}', './src/**/*.{js,jsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        panel: '#181a20',
        surface: '#1e2329',
        border: '#2b3139',
        primary: '#2c79bb',
        success: '#12cf7a',
        danger: '#f24d58',
        muted: '#8fa0bb',
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx}', './src/**/*.{js,jsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        panel: '#0d1a16',
        surface: '#112319',
        border: '#1a3328',
        primary: '#00674F',
        secondary: '#D3D3D3',
        success: '#12cf7a',
        danger: '#f24d58',
        muted: '#7a9e94',
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#050506',
          panel: '#0c0c0e',
          grid: '#1a1a24',
          cyan: '#00f0ff',
          pink: '#ff007f',
          green: '#39ff14',
          yellow: '#ffff00',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'neon-cyan': '0 0 10px rgba(0, 240, 255, 0.3), 0 0 2px rgba(0, 240, 255, 0.6)',
        'neon-pink': '0 0 10px rgba(255, 0, 127, 0.3), 0 0 2px rgba(255, 0, 127, 0.6)',
        'neon-green': '0 0 10px rgba(57, 255, 20, 0.3), 0 0 2px rgba(57, 255, 20, 0.6)',
      }
    },
  },
  plugins: [],
}

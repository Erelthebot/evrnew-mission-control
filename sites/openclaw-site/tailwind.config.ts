import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0d0d0d',
        surface: '#161616',
        's2': '#1e1e1e',
        border: '#2a2a2a',
        accent: '#00e5ff',
        'accent-2': '#7c3aed',
        muted: '#666666',
      },
      fontFamily: {
        mono: ['"SF Mono"', '"Fira Code"', '"Fira Mono"', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config

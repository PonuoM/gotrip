import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ===== Brand Palette (60/30/10) =====
        brand: {
          white: '#FFFFFF',  // 60% — background
          red:   '#E63946',  // 30% — CTA, hero
          black: '#1A1A1A',  // 10% — text, borders
        },

        // ===== Supporting =====
        line: '#06C755',  // LINE brand green

        // ===== Semantic =====
        success: '#16A34A',
        warning: '#F59E0B',
        danger:  '#DC2626',
      },
      fontFamily: {
        sans: ['Sarabun', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
        display: ['Sarabun', 'Inter', 'sans-serif'],
      },
      fontSize: {
        // ===== Type Scale =====
        'display': ['48px', { lineHeight: '0.95', letterSpacing: '-1.5px', fontWeight: '900' }],
        'h1':      ['32px', { lineHeight: '1', letterSpacing: '-0.5px', fontWeight: '900' }],
        'h2':      ['24px', { lineHeight: '1.1', fontWeight: '700' }],
        'h3':      ['18px', { lineHeight: '1.2', fontWeight: '700' }],
        'body':    ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        'caption': ['13px', { lineHeight: '1.4', fontWeight: '500' }],
        'meta':    ['11px', { lineHeight: '1.2', letterSpacing: '2px', fontWeight: '700' }],
      },
      borderRadius: {
        'pill': '100px',
      },
      borderWidth: {
        '3': '3px',
      },
      animation: {
        'rotate-1-neg': 'rotate1Neg 0s forwards',
        'rotate-half': 'rotateHalf 0s forwards',
      },
    },
  },
  plugins: [],
}

export default config

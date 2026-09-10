import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#0A0D13',
        panel: '#111621',
        raised: '#171E2C',
        edge: '#232C3D',
        edgeSoft: '#1A2130',
        ink: '#E6EAF2',
        muted: '#8B95A8',
        faint: '#5C6679',
        price: '#5AA9FF',
        soc: '#8B7BF0',
        charge: '#F0A030',
        discharge: '#2ED095',
        warn: '#FFC44D',
        danger: '#FF6B6B',
        synth: '#C77DFF',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', 'Segoe UI', 'Inter', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'Liberation Mono', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
    },
  },
  plugins: [],
}

export default config

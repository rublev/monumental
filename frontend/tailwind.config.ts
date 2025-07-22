import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        monumental: {
          purple: {
            light: '#1e1548',
            DEFAULT: '#2d1b69',
          },
          orange: {
            DEFAULT: '#ff5f2e',
            hover: '#e5471a',
          },
        },
      },
    },
  },
  plugins: [],
}

export default config

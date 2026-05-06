/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        jianghu: {
          gold: '#d4a556',
          red: '#8b2942',
          dark: '#1a1a2e',
          light: '#f5f0e1',
          ink: '#2c2c2c',
          jade: '#5b8c5a',
          silk: '#f0e6d3',
          bronze: '#8c6b3a',
          vermilion: '#c43a31',
        }
      },
      fontFamily: {
        'serif-sc': ['"Noto Serif SC"', '"Songti SC"', '"SimSun"', 'serif'],
        'calligraphy': ['"Ma Shan Zheng"', '"ZCOOL KuaiLe"', 'cursive'],
      },
      boxShadow: {
        'inner-glow': 'inset 0 2px 20px rgba(212,165,86,0.08)',
        'gold': '0 0 24px rgba(212,165,86,0.25), 0 0 60px rgba(212,165,86,0.08)',
        'purple-glow': '0 0 30px rgba(168,85,247,0.3), 0 0 60px rgba(168,85,247,0.1)',
        'combat': '0 0 20px rgba(220,38,38,0.3), 0 0 40px rgba(220,38,38,0.1)',
        'card': '0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)',
        'card-hover': '0 12px 40px rgba(0,0,0,0.5), 0 4px 16px rgba(212,165,86,0.15)',
      },
      animationDuration: {
        '400': '400ms',
        '600': '600ms',
        '800': '800ms',
        '1200': '1200ms',
        '2000': '2000ms',
        '3000': '3000ms',
      },
      transitionTimingFunction: {
        'bounce-soft': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'out-expo': 'cubic-bezier(0.19, 1, 0.22, 1)',
      },
      keyframes: {
        'ink-spread': {
          '0%': { clipPath: 'circle(0% at 50% 50%)', opacity: '0' },
          '100%': { clipPath: 'circle(100% at 50% 50%)', opacity: '1' },
        },
        'scroll-unroll': {
          '0%': { transform: 'scaleY(0)', transformOrigin: 'top', opacity: '0' },
          '100%': { transform: 'scaleY(1)', transformOrigin: 'top', opacity: '1' },
        },
        'silk-wave': {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '25%': { transform: 'translateY(-2px) rotate(0.5deg)' },
          '75%': { transform: 'translateY(2px) rotate(-0.5deg)' },
        },
        'lantern-sway': {
          '0%, 100%': { transform: 'rotate(-2deg)' },
          '50%': { transform: 'rotate(2deg)' },
        },
        'dust-float': {
          '0%, 100%': { transform: 'translateY(0) translateX(0)', opacity: '0' },
          '20%': { opacity: '0.6' },
          '80%': { opacity: '0.3' },
          '100%': { transform: 'translateY(-60px) translateX(15px)', opacity: '0' },
        },
        'skeleton-pulse': {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '0.6' },
        },
        'border-rotate': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'name-glow': {
          '0%, 100%': { textShadow: '0 0 8px rgba(212,165,86,0.3), 0 0 20px rgba(212,165,86,0.1)' },
          '50%': { textShadow: '0 0 16px rgba(212,165,86,0.6), 0 0 40px rgba(212,165,86,0.25), 0 0 60px rgba(212,165,86,0.1)' },
        },
        'scroll-glow': {
          '0%, 100%': { boxShadow: '0 0 0 rgba(212,165,86,0), inset 0 0 0 rgba(212,165,86,0)' },
          '50%': { boxShadow: '0 0 30px rgba(212,165,86,0.15), inset 0 0 20px rgba(212,165,86,0.05)' },
        },
      },
      animation: {
        'ink-spread': 'ink-spread 0.8s ease-out',
        'scroll-unroll': 'scroll-unroll 0.6s ease-out',
        'silk-wave': 'silk-wave 4s ease-in-out infinite',
        'lantern-sway': 'lantern-sway 3s ease-in-out infinite',
        'dust-float': 'dust-float 2s ease-out forwards',
        'skeleton-pulse': 'skeleton-pulse 1.8s ease-in-out infinite',
        'border-rotate': 'border-rotate 8s linear infinite',
        'name-glow': 'name-glow 3s ease-in-out infinite',
        'scroll-glow': 'scroll-glow 4s ease-in-out infinite',
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: '#d4d4d8',
            p: { color: '#d4d4d8' },
            strong: { color: '#fff' },
            a: { color: '#d4a556' },
          },
        },
      },
    },
  },
  plugins: [],
}

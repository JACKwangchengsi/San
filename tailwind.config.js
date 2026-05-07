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
      // ⚠ 水墨/国风关键帧统一在 src/index.css 中定义（CSS 版本更丰富，Tailwind 版本会被覆盖）
      // 此处仅保留 Tailwind 原生不提供的扩展配置
    },
  },
  plugins: [],
}

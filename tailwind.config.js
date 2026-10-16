export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sc: {
          bg: 'var(--sc-bg, #121212)',
          surface: 'var(--sc-surface, #1e1e1e)',
          hover: 'var(--sc-hover, #282828)',
          border: 'var(--sc-border, #333333)',
          accent: 'var(--sc-accent, #ff5500)',
          'accent-hover': 'var(--sc-accent-hover, #ff6a00)',
          'text-primary': 'var(--sc-text-primary, #ffffff)',
          'text-secondary': 'var(--sc-text-secondary, #999999)',
          'wave-inactive': 'var(--sc-wave-inactive, #444444)',
          'wave-active': 'var(--sc-wave-active, #ff5500)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        sc: '4px',
      },
      animation: {
        'marquee': 'marquee 15s linear infinite',
        'spin-slow': 'spin 1.2s linear infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
      },
    },
  },
  plugins: [],
};

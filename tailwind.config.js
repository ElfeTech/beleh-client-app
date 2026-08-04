/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        display: ['Plus Jakarta Sans', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: [
          'JetBrains Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Consolas',
          'Liberation Mono',
          'monospace',
        ],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1.25' }],
        xs: ['0.6875rem', { lineHeight: '1.35' }],
        sm: ['0.8125rem', { lineHeight: '1.45' }],
        base: ['0.875rem', { lineHeight: '1.5' }],
        md: ['0.9375rem', { lineHeight: '1.5' }],
        lg: ['1.0625rem', { lineHeight: '1.45' }],
        xl: ['1.25rem', { lineHeight: '1.35' }],
        '2xl': ['1.375rem', { lineHeight: '1.3' }],
        '3xl': ['1.5rem', { lineHeight: '1.25' }],
      },
      colors: {
        brand: {
          primary: 'var(--primary-500)',
          secondary: 'var(--gray-800)',
          accent: 'var(--error)',
          surface: 'var(--bg-secondary)',
          border: 'var(--border-primary)',
        },
        primary: {
          DEFAULT: 'var(--primary-600)',
          foreground: 'var(--btn-primary-text)',
        },
        secondary: {
          DEFAULT: 'var(--gray-800)',
          foreground: 'var(--btn-primary-text)',
        },
        muted: {
          DEFAULT: 'var(--gray-100)',
          foreground: 'var(--text-muted)',
        },
        accent: {
          DEFAULT: 'var(--gray-100)',
          foreground: 'var(--text-primary)',
        },
        popover: {
          DEFAULT: 'var(--bg-modal)',
          foreground: 'var(--text-primary)',
        },
        background: 'var(--bg-primary)',
        foreground: 'var(--text-primary)',
        border: 'var(--border-primary)',
        input: 'var(--border-primary)',
        ring: 'var(--primary-500)',
      },
      borderRadius: {
        lg: '1rem',
        md: '0.75rem',
        sm: '0.5rem',
      },
      boxShadow: {
        soft: '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        glow: '0 0 15px rgba(59, 130, 246, 0.5)',
      },
    },
  },
  plugins: [],
};

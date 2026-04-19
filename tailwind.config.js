/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "var(--primary-500)",
          secondary: "var(--gray-800)",
          accent: "var(--error)",
          surface: "var(--bg-secondary)",
          border: "var(--border-primary)",
        },
        primary: {
          DEFAULT: "var(--primary-600)",
          foreground: "var(--btn-primary-text)",
        },
        secondary: {
          DEFAULT: "var(--gray-800)",
          foreground: "var(--btn-primary-text)",
        },
        muted: {
          DEFAULT: "var(--gray-100)",
          foreground: "var(--text-muted)",
        },
        accent: {
          DEFAULT: "var(--gray-100)",
          foreground: "var(--text-primary)",
        },
        popover: {
            DEFAULT: "var(--bg-modal)",
            foreground: "var(--text-primary)",
        },
        background: "var(--bg-primary)",
        foreground: "var(--text-primary)",
        border: "var(--border-primary)",
        input: "var(--border-primary)",
        ring: "var(--primary-500)",
      },
      borderRadius: {
        lg: "1rem",
        md: "0.75rem",
        sm: "0.5rem",
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'glow': '0 0 15px rgba(59, 130, 246, 0.5)',
      }
    },
  },
  plugins: [],
}

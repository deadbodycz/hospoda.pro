/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/contexts/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Background / Surface ─────────────────────────────────
        'background':                 '#0d0d0e',
        'surface':                    '#141415',
        'surface-container-low':      '#141415',
        'surface-container':          '#1c1c1e',
        'surface-container-high':     '#232325',
        'surface-container-highest':  '#2a2a2c',
        'surface-variant':            '#1c1c1e',
        // ── On-surface ───────────────────────────────────────────
        'on-surface':                 '#f0f0f0',
        'on-surface-variant':         '#888888',
        'on-background':              '#f0f0f0',
        // ── Primary (olive) ──────────────────────────────────────
        'primary':                    '#8A9900',
        'primary-container':          '#6d7a00',
        'on-primary':                 '#ffffff',
        'on-primary-container':       '#ffffff',
        // ── Error ────────────────────────────────────────────────
        'error':                      '#e05555',
        'error-container':            '#7a1c1c',
        'on-error':                   '#ffffff',
        // ── Outline ──────────────────────────────────────────────
        'outline':                    '#5a5a5e',
        'outline-variant':            '#232325',
      },
      fontFamily: {
        sans:     ['var(--font-geist-sans)', 'sans-serif'],
        mono:     ['var(--font-geist-mono)', 'monospace'],
        headline: ['var(--font-geist-sans)', 'sans-serif'],
        body:     ['var(--font-geist-sans)', 'sans-serif'],
        label:    ['var(--font-geist-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
}

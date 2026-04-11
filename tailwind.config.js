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
  // Safelist dynamic avatar color classes generated in lib/colors.ts
  safelist: [
    { pattern: /^bg-(amber|rose|sky|emerald|violet|orange|teal|indigo|cyan|fuchsia)-500\/(20|10)$/ },
    { pattern: /^text-(amber|rose|sky|emerald|violet|orange|teal|indigo|cyan|fuchsia)-500$/ },
    { pattern: /^border-(amber|rose|sky|emerald|violet|orange|teal|indigo|cyan|fuchsia)-500\/(30|50)$/ },
  ],
  theme: {
    extend: {
      colors: {
        // ── Surface palette ──────────────────────────────────────
        'surface':                    '#131412',
        'surface-dim':                '#131412',
        'surface-bright':             '#393937',
        'surface-container-lowest':   '#0d0e0d',
        'surface-container-low':      '#1b1c1a',
        'surface-container':          '#1f201e',
        'surface-container-high':     '#292a28',
        'surface-container-highest':  '#343533',
        'surface-variant':            '#343533',
        'surface-tint':               '#ffb94c',
        // ── On-surface ───────────────────────────────────────────
        'on-surface':                 '#e4e2de',
        'on-surface-variant':         '#d6c4ae',
        'on-background':              '#e4e2de',
        'background':                 '#131412',
        // ── Primary ──────────────────────────────────────────────
        'primary':                    '#ffbe5b',
        'primary-container':          '#e8a020',
        'primary-fixed':              '#ffddb2',
        'primary-fixed-dim':          '#ffb94c',
        'on-primary':                 '#442b00',
        'on-primary-container':       '#5b3b00',
        'on-primary-fixed':           '#291800',
        'on-primary-fixed-variant':   '#624000',
        'inverse-primary':            '#815500',
        // ── Secondary ────────────────────────────────────────────
        'secondary':                  '#cbc6bd',
        'secondary-container':        '#494740',
        'secondary-fixed':            '#e7e2d8',
        'secondary-fixed-dim':        '#cbc6bd',
        'on-secondary':               '#32302a',
        'on-secondary-container':     '#b9b5ac',
        'on-secondary-fixed':         '#1d1b16',
        'on-secondary-fixed-variant': '#494740',
        // ── Tertiary ─────────────────────────────────────────────
        'tertiary':                   '#94d0ff',
        'tertiary-container':         '#4ab7fc',
        'tertiary-fixed':             '#cae6ff',
        'tertiary-fixed-dim':         '#8dcdff',
        'on-tertiary':                '#00344f',
        'on-tertiary-container':      '#004668',
        'on-tertiary-fixed':          '#001e30',
        'on-tertiary-fixed-variant':  '#004b70',
        // ── Error ────────────────────────────────────────────────
        'error':                      '#ffb4ab',
        'error-container':            '#93000a',
        'on-error':                   '#690005',
        'on-error-container':         '#ffdad6',
        // ── Misc ─────────────────────────────────────────────────
        'outline':                    '#9e8e7a',
        'outline-variant':            '#514534',
        'inverse-surface':            '#e4e2de',
        'inverse-on-surface':         '#30312e',
      },
      borderRadius: {
        DEFAULT: '1rem',
        lg:      '2rem',
        xl:      '3rem',
        full:    '9999px',
      },
      fontFamily: {
        sans:     ['var(--font-geist-sans)', 'sans-serif'],
        mono:     ['var(--font-geist-mono)', 'monospace'],
        headline: ['var(--font-geist-sans)', 'sans-serif'],
        body:     ['var(--font-geist-sans)', 'sans-serif'],
        label:    ['var(--font-geist-mono)', 'monospace'],
      },
      backgroundImage: {
        'beer-gradient': 'linear-gradient(135deg, #ffbe5b 0%, #e8a020 100%)',
      },
    },
  },
  plugins: [],
}

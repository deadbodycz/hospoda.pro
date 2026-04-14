# Redesign UI + Google Vision OCR Hybrid — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Anthropic vision with Google Vision OCR + Claude text parsing, and fully redesign the app from amber/gold to olive (#8A9900) with Lucide icons, square-rounded corners, vertical drink list, and earthy avatar colors.

**Architecture:** Google Vision REST API extracts raw text from menu photos; `parseMenuText()` in `lib/anthropic.ts` sends that text to Claude for semantic extraction. UI design tokens are updated in `tailwind.config.js` and `globals.css`; components are rewritten in-place (no new files for components). Avatar colors switch from dynamic Tailwind class names to inline CSS values returned by `lib/colors.ts`.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS v3, lucide-react (new), Google Cloud Vision REST API (new), Anthropic SDK (existing).

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `src/lib/googleVision.ts` | **Create** | Google Cloud Vision REST wrapper |
| `src/lib/anthropic.ts` | Modify | Replace `scanMenuImage` with `parseMenuText(ocrText)` |
| `src/app/api/scan/route.ts` | Modify | OCR → parse flow |
| `tailwind.config.js` | Modify | New olive tokens, remove borderRadius override, remove beer-gradient |
| `src/app/globals.css` | Modify | New body bg, remove beer-gradient/brewery-shadow, add accent-shadow |
| `src/lib/colors.ts` | Modify | Earthy palette returned as inline CSS values (not Tailwind classes) |
| `src/app/layout.tsx` | Modify | Remove Material Symbols Google Fonts link; update themeColor |
| `src/components/ThemeToggle.tsx` | Modify | Lucide Moon/Sun |
| `src/components/BottomNav.tsx` | Modify | Lucide icons, floating rounded card style |
| `src/components/DrinkChips.tsx` | Modify | Vertical list with Lucide drink icons |
| `src/components/UserCard.tsx` | Modify | Inline avatar style, square corners, counter top row, breakdown below |
| `src/components/ScanModal.tsx` | Modify | Lucide X and PlusCircle icons |
| `src/app/page.tsx` | Modify | New olive onboarding style |
| `src/app/[pubId]/page.tsx` | Modify | Olive tokens, Lucide icons, updated prompts |
| `src/app/[pubId]/account/page.tsx` | Modify | Olive total card, per-person breakdown new style |
| `src/app/[pubId]/settings/page.tsx` | Modify | Replace Material Symbols, amber→olive tokens |
| `src/app/[pubId]/users/page.tsx` | Modify | Replace Material Symbols, avatar inline styles |
| `src/app/[pubId]/scan/page.tsx` | Modify | Replace Material Symbols, olive tokens |

---

## Task 1: Create `lib/googleVision.ts`

**Files:**
- Create: `src/lib/googleVision.ts`

- [ ] **Add `GOOGLE_VISION_API_KEY` note to `.env.local`**

  Open `.env.local` and add the line (get key from Google Cloud Console → APIs & Services → Credentials):
  ```
  GOOGLE_VISION_API_KEY=your_key_here
  ```

- [ ] **Create `src/lib/googleVision.ts`**

  ```ts
  /**
   * Google Cloud Vision — DOCUMENT_TEXT_DETECTION via REST API.
   * Returns the full extracted text from an image, or empty string if none found.
   */

  const VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate'

  interface VisionResponse {
    responses: Array<{
      fullTextAnnotation?: {
        text: string
      }
      error?: {
        message: string
      }
    }>
  }

  export async function extractTextFromImage(
    base64Image: string,
    mimeType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg'
  ): Promise<string> {
    const apiKey = process.env.GOOGLE_VISION_API_KEY
    if (!apiKey) throw new Error('GOOGLE_VISION_API_KEY není nastavený')

    const body = {
      requests: [
        {
          image: { content: base64Image },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }],
          imageContext: { languageHints: ['cs', 'sk'] },
        },
      ],
    }

    const res = await fetch(`${VISION_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      throw new Error(`Google Vision API error: ${res.status} ${res.statusText}`)
    }

    const data: VisionResponse = await res.json()
    const response = data.responses[0]

    if (response.error) {
      throw new Error(`Google Vision error: ${response.error.message}`)
    }

    return response.fullTextAnnotation?.text ?? ''
  }
  ```

- [ ] **Commit**

  ```bash
  git add src/lib/googleVision.ts
  git commit -m "feat: Google Cloud Vision OCR wrapper"
  git push
  ```

---

## Task 2: Update `lib/anthropic.ts` — add `parseMenuText`

**Files:**
- Modify: `src/lib/anthropic.ts`

- [ ] **Replace the file content**

  ```ts
  import Anthropic from '@anthropic-ai/sdk'
  import type { ScannedItem } from '@/types'

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const PARSE_PROMPT = `Z níže uvedeného textu z ceníku nápojů extrahuj seznam nápojů.
  Vrať POUZE JSON v tomto formátu, bez markdown:
  {
    "items": [
      { "name": "Pilsner Urquell 0,5l", "priceSmall": null, "priceLarge": 52 },
      { "name": "Kozel 0,3l", "priceSmall": 38, "priceLarge": null }
    ]
  }
  Pravidla:
  - name: název nápoje včetně objemu
  - priceSmall: cena malé porce (0,3l nebo 0,2l) nebo null
  - priceLarge: cena velké porce (0,5l nebo 0,4l) nebo null
  - Zahrň pouze nápoje s jasnou cenou
  - Ignoruj jídla
  - Pokud text neobsahuje žádné nápoje, vrať { "items": [] }`

  export async function parseMenuText(ocrText: string): Promise<ScannedItem[]> {
    if (!ocrText.trim()) return []

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `${PARSE_PROMPT}\n\nTEXT Z CENÍKU:\n${ocrText}`,
        },
      ],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const parsed = JSON.parse(text) as { items: ScannedItem[] }
    return parsed.items
  }
  ```

- [ ] **Commit**

  ```bash
  git add src/lib/anthropic.ts
  git commit -m "feat: parseMenuText — Claude parsing of OCR text"
  git push
  ```

---

## Task 3: Update `app/api/scan/route.ts` — hybrid OCR flow

**Files:**
- Modify: `src/app/api/scan/route.ts`

- [ ] **Replace the file content**

  ```ts
  import { NextRequest, NextResponse } from 'next/server'
  import { extractTextFromImage } from '@/lib/googleVision'
  import { parseMenuText } from '@/lib/anthropic'

  export async function POST(req: NextRequest) {
    try {
      const form = await req.formData()
      const file = form.get('image') as File | null
      if (!file) {
        return NextResponse.json({ error: 'Chybí obrázek.' }, { status: 400 })
      }

      const arrayBuffer = await file.arrayBuffer()
      const base64 = Buffer.from(arrayBuffer).toString('base64')
      const mimeType = (file.type as 'image/jpeg' | 'image/png' | 'image/webp') ?? 'image/jpeg'

      // Step 1: Google Vision OCR
      const ocrText = await extractTextFromImage(base64, mimeType)

      if (!ocrText.trim()) {
        return NextResponse.json({ items: [] })
      }

      // Step 2: Claude parses the extracted text
      const items = await parseMenuText(ocrText)

      return NextResponse.json({ items })
    } catch (err) {
      console.error('[scan]', err)
      return NextResponse.json(
        { error: 'Nepodařilo se rozpoznat text z obrázku. Zkus to znovu.' },
        { status: 500 }
      )
    }
  }
  ```

- [ ] **Verify TypeScript compiles**

  ```bash
  cd c:/projekty/Hospoda.pro && npx tsc --noEmit 2>&1 | head -30
  ```
  Expected: no errors (or only pre-existing errors unrelated to these files).

- [ ] **Commit**

  ```bash
  git add src/app/api/scan/route.ts
  git commit -m "feat: scan route — Google Vision OCR + Claude parsing hybrid"
  git push
  ```

---

## Task 4: `tailwind.config.js` — new design tokens

**Files:**
- Modify: `tailwind.config.js`

**Critical:** The current config overrides `borderRadius` with non-standard values (`rounded-lg` = 32px). Removing this override restores Tailwind defaults (`rounded-lg` = 8px, `rounded-xl` = 12px, `rounded-2xl` = 16px). Every component is being rewritten in later tasks so this is intentional.

- [ ] **Replace `tailwind.config.js`**

  ```js
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
  ```

- [ ] **Commit**

  ```bash
  git add tailwind.config.js
  git commit -m "design: new olive color tokens, remove amber + borderRadius override"
  git push
  ```

---

## Task 5: `globals.css` — new styles

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Replace file content**

  ```css
  @tailwind base;
  @tailwind components;
  @tailwind utilities;

  /* ── Custom utilities ───────────────────────────────────────── */
  @layer utilities {
    .accent-shadow {
      box-shadow: 0 4px 24px rgba(138, 153, 0, 0.18);
    }

    .grain-texture {
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
      opacity: 0.04;
      pointer-events: none;
    }
  }

  /* ── Global resets ──────────────────────────────────────────── */
  :root {
    color-scheme: dark;
  }

  html.light {
    color-scheme: light;
  }

  /* Hide scrollbars globally */
  ::-webkit-scrollbar { display: none; }
  * { -ms-overflow-style: none; scrollbar-width: none; }

  body {
    background-color: #0d0d0e;
    color: #f0f0f0;
    min-height: 100dvh;
    -webkit-tap-highlight-color: transparent;
    transition: background-color 300ms, color 300ms;
  }

  /* ── Light mode overrides ───────────────────────────────────── */
  html.light body {
    background-color: #f5f5f0;
    color: #1a1a16;
  }

  html.light .bg-background   { background-color: #f5f5f0 !important; }
  html.light .bg-surface      { background-color: #ebebeb !important; }
  html.light .text-on-surface { color: #1a1a16 !important; }
  html.light .text-primary    { color: #6b7700 !important; }
  ```

- [ ] **Commit**

  ```bash
  git add src/app/globals.css
  git commit -m "design: olive globals.css — remove beer-gradient, new accent-shadow"
  git push
  ```

---

## Task 6: `lib/colors.ts` — earthy inline styles

**Files:**
- Modify: `src/lib/colors.ts`

**Note:** This changes the return type of `getAvatarClasses` from Tailwind class name strings to CSS color values. Every component that uses `getAvatarClasses` must switch from `className` to `style`. Affected files: `UserCard.tsx`, `account/page.tsx`, `users/page.tsx` — all rewritten in later tasks.

- [ ] **Replace file content**

  ```ts
  /**
   * Deterministické přiřazení barvy avataru z jména uživatele.
   * Vrací CSS hodnoty pro inline style — zemité tóny laditné k olivové.
   */

  export interface AvatarStyle {
    bg: string      // pro style.backgroundColor
    color: string   // pro style.color
    border: string  // pro style.borderColor
  }

  const AVATAR_PALETTE: AvatarStyle[] = [
    { bg: 'rgba(138,120,80,0.15)',  color: '#C4A868', border: 'rgba(138,120,80,0.3)'  }, // ochre
    { bg: 'rgba(90,130,120,0.15)', color: '#6AADA0', border: 'rgba(90,130,120,0.3)'  }, // muted teal
    { bg: 'rgba(140,100,90,0.15)', color: '#C07A6A', border: 'rgba(140,100,90,0.3)'  }, // terracotta
    { bg: 'rgba(110,95,150,0.15)', color: '#9A82C8', border: 'rgba(110,95,150,0.3)'  }, // dusty violet
    { bg: 'rgba(80,120,160,0.15)', color: '#6A9AB8', border: 'rgba(80,120,160,0.3)'  }, // slate blue
    { bg: 'rgba(150,110,70,0.15)', color: '#C89060', border: 'rgba(150,110,70,0.3)'  }, // warm sienna
  ]

  function hashString(s: string): number {
    let hash = 0
    for (let i = 0; i < s.length; i++) {
      hash = (hash << 5) - hash + s.charCodeAt(i)
      hash |= 0
    }
    return Math.abs(hash)
  }

  export function getAvatarStyle(name: string): AvatarStyle {
    return AVATAR_PALETTE[hashString(name) % AVATAR_PALETTE.length]
  }

  /** Initials from a display name (max 2 chars) */
  export function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  ```

- [ ] **Commit**

  ```bash
  git add src/lib/colors.ts
  git commit -m "design: earthy avatar palette — inline CSS values"
  git push
  ```

---

## Task 7: Install lucide-react + update `layout.tsx`

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Install lucide-react**

  ```bash
  cd c:/projekty/Hospoda.pro && npm install lucide-react
  ```

- [ ] **Update `src/app/layout.tsx`** — remove Material Symbols, update themeColor

  ```tsx
  import type { Metadata, Viewport } from 'next'
  import { GeistSans } from 'geist/font/sans'
  import { GeistMono } from 'geist/font/mono'
  import './globals.css'
  import { ThemeProvider } from '@/contexts/ThemeContext'
  import { ToastProvider } from '@/components/ui/Toast'

  export const metadata: Metadata = {
    title: 'Hospoda.pro',
    description: 'Sleduj, kolik jsi v hospodě vypil',
    manifest: '/manifest.json',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: 'Hospoda.pro',
    },
    formatDetection: { telephone: false },
  }

  export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: '#0d0d0e',
    viewportFit: 'cover',
  }

  export default function RootLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    return (
      <html
        lang="cs"
        suppressHydrationWarning
        className={`${GeistSans.variable} ${GeistMono.variable}`}
      >
        <head>
          {/* Prevent theme flash */}
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){var t=localStorage.getItem('theme')||(window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');document.documentElement.classList.add(t)})()`,
            }}
          />
        </head>
        <body className="bg-background text-on-surface font-sans selection:bg-primary/30">
          <ThemeProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </ThemeProvider>
          <div className="grain-texture fixed inset-0 z-0 pointer-events-none" aria-hidden />
        </body>
      </html>
    )
  }
  ```

- [ ] **Commit**

  ```bash
  git add package.json package-lock.json src/app/layout.tsx
  git commit -m "feat: install lucide-react, remove Material Symbols from layout"
  git push
  ```

---

## Task 8: `ThemeToggle.tsx` — Lucide icons

**Files:**
- Modify: `src/components/ThemeToggle.tsx`

- [ ] **Replace file content**

  ```tsx
  'use client'

  import { Moon, Sun } from 'lucide-react'
  import { useTheme } from '@/contexts/ThemeContext'

  export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme()

    return (
      <button
        onClick={toggleTheme}
        className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-surface-container transition-colors active:scale-95"
        aria-label={theme === 'dark' ? 'Přepnout na světlý režim' : 'Přepnout na tmavý režim'}
      >
        {theme === 'dark'
          ? <Sun className="w-5 h-5 text-outline" />
          : <Moon className="w-5 h-5 text-outline" />
        }
      </button>
    )
  }
  ```

- [ ] **Commit**

  ```bash
  git add src/components/ThemeToggle.tsx
  git commit -m "design: ThemeToggle — Lucide Moon/Sun"
  git push
  ```

---

## Task 9: `BottomNav.tsx` — floating card with Lucide

**Files:**
- Modify: `src/components/BottomNav.tsx`

- [ ] **Replace file content**

  ```tsx
  'use client'

  import Link from 'next/link'
  import { usePathname } from 'next/navigation'
  import { useToast } from '@/components/ui/Toast'
  import { Layers, Users, Receipt, Settings, MapPin } from 'lucide-react'

  interface BottomNavProps {
    pubId?: string
  }

  export function BottomNav({ pubId }: BottomNavProps) {
    const pathname = usePathname()
    const { toast } = useToast()

    const tabs = pubId
      ? [
          { icon: Layers,   label: 'Počítej',    href: `/${pubId}`,          exact: true  },
          { icon: Users,    label: 'Lidé',        href: `/${pubId}/users`,    exact: false },
          { icon: Receipt,  label: 'Účet',        href: `/${pubId}/account`,  exact: false },
          { icon: Settings, label: 'Nastavení',   href: `/${pubId}/settings`, exact: false },
        ]
      : [
          { icon: MapPin,   label: 'Hospody',     href: '/',                  exact: true  },
          { icon: Users,    label: 'Lidé',        href: null,                 exact: false },
          { icon: Receipt,  label: 'Účet',        href: null,                 exact: false },
          { icon: Settings, label: 'Nastavení',   href: null,                 exact: false },
        ]

    const isActive = (href: string | null, exact: boolean) => {
      if (!href) return false
      if (exact) return pathname === href
      return pathname.startsWith(href)
    }

    return (
      <nav
        className="fixed bottom-0 left-0 w-full z-50 px-3"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
      >
        <div className="bg-surface border border-outline-variant rounded-2xl px-4 py-2 flex justify-around items-center">
          {tabs.map((tab) => {
            const active = isActive(tab.href, tab.exact)
            const Icon = tab.icon

            if (!tab.href) {
              return (
                <button
                  key={tab.label}
                  onClick={() => toast('Přichází brzy', 'info')}
                  className="flex flex-col items-center gap-1 min-w-[48px] min-h-[48px] justify-center"
                >
                  <div className="w-7 h-7 flex items-center justify-center rounded-lg">
                    <Icon className="w-4 h-4 text-outline" />
                  </div>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-outline">
                    {tab.label}
                  </span>
                </button>
              )
            }

            return (
              <Link
                key={tab.label}
                href={tab.href}
                className="flex flex-col items-center gap-1 min-w-[48px] min-h-[48px] justify-center active:scale-95 transition-transform"
              >
                <div
                  className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                    active ? 'bg-primary' : ''
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${active ? 'text-on-primary' : 'text-outline'}`}
                  />
                </div>
                <span
                  className={`font-mono text-[9px] uppercase tracking-widest ${
                    active ? 'text-primary' : 'text-outline'
                  }`}
                >
                  {tab.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    )
  }
  ```

- [ ] **Commit**

  ```bash
  git add src/components/BottomNav.tsx
  git commit -m "design: BottomNav — floating card, Lucide icons, olive active"
  git push
  ```

---

## Task 10: `DrinkChips.tsx` — vertical list with Lucide drink icons

**Files:**
- Modify: `src/components/DrinkChips.tsx`

- [ ] **Replace file content**

  ```tsx
  'use client'

  import { Beer, Wine, GlassWater, Coffee, type LucideIcon } from 'lucide-react'
  import type { Drink } from '@/types'

  interface DrinkChipsProps {
    drinks: Drink[]
    selected: string | null
    onSelect: (id: string) => void
  }

  function formatPrice(drink: Drink): string {
    const price = drink.price_large ?? drink.price_small
    if (price === null) return ''
    return `${Math.round(price)} Kč`
  }

  function getDrinkIcon(name: string): LucideIcon {
    const n = name.toLowerCase()
    if (n.includes('víno') || n.includes('vino') || n.includes('wine')) return Wine
    if (n.includes('káva') || n.includes('kava') || n.includes('coffee')) return Coffee
    if (n.includes('voda') || n.includes('water') || n.includes('džus') || n.includes('limonáda')) return GlassWater
    if (n.includes('panák') || n.includes('shot') || n.includes('slivovice') || n.includes('rum') || n.includes('vodka')) return GlassWater
    return Beer
  }

  export function DrinkChips({ drinks, selected, onSelect }: DrinkChipsProps) {
    if (drinks.length === 0) return null

    return (
      <section
        className="sticky top-14 z-40 bg-background/95 backdrop-blur-sm -mx-4 px-4 pb-3 pt-2"
        aria-label="Výběr nápoje"
      >
        <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden max-h-[40vh] overflow-y-auto">
          {drinks.map((drink, idx) => {
            const active = selected === drink.id
            const isLast = idx === drinks.length - 1
            const Icon = getDrinkIcon(drink.name)

            return (
              <button
                key={drink.id}
                onClick={() => onSelect(drink.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                  ${!isLast ? 'border-b border-outline-variant' : ''}
                  ${active
                    ? 'bg-primary/12'
                    : 'hover:bg-surface-container'
                  }
                `}
                aria-pressed={active}
              >
                <Icon
                  className={`w-4 h-4 flex-shrink-0 ${active ? 'text-[#a8bc00]' : 'text-outline'}`}
                />
                <span
                  className={`text-sm font-medium flex-1 truncate ${
                    active ? 'text-[#a8bc00]' : 'text-on-surface-variant'
                  }`}
                >
                  {drink.name}
                </span>
                <span
                  className={`text-sm font-mono flex-shrink-0 tabular-nums ${
                    active ? 'text-[#a8bc00] opacity-70' : 'text-outline'
                  }`}
                >
                  {formatPrice(drink)}
                </span>
              </button>
            )
          })}
        </div>
      </section>
    )
  }
  ```

- [ ] **Commit**

  ```bash
  git add src/components/DrinkChips.tsx
  git commit -m "design: DrinkChips — vertical list, Lucide drink icons"
  git push
  ```

---

## Task 11: `UserCard.tsx` — new layout with inline avatar + breakdown below

**Files:**
- Modify: `src/components/UserCard.tsx`

- [ ] **Replace file content**

  ```tsx
  'use client'

  import { Minus, Plus } from 'lucide-react'
  import { getAvatarStyle, getInitials } from '@/lib/colors'
  import { haptic } from '@/lib/haptics'
  import type { Drink, SessionUser } from '@/types'
  import type { DrinkBreakdownItem } from '@/contexts/SessionContext'

  interface UserCardProps {
    user: SessionUser
    count: number
    total: number
    selectedDrink: Drink | null
    drinkBreakdown: DrinkBreakdownItem[]
    onIncrement: () => void
    onDecrement: () => void
  }

  export function UserCard({
    user,
    count,
    total,
    selectedDrink,
    drinkBreakdown,
    onIncrement,
    onDecrement,
  }: UserCardProps) {
    const av = getAvatarStyle(user.name)
    const initials = getInitials(user.name)

    function handleIncrement() {
      haptic(10)
      onIncrement()
    }

    function handleDecrement() {
      if (count === 0) return
      haptic(10)
      onDecrement()
    }

    return (
      <article className="bg-surface border border-outline-variant rounded-2xl p-4">
        {/* Top row: avatar + name + counter */}
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg border flex items-center justify-center font-bold text-xs flex-shrink-0"
            style={{ backgroundColor: av.bg, color: av.color, borderColor: av.border }}
            aria-hidden
          >
            {initials}
          </div>

          <span className="font-semibold text-on-surface text-sm flex-1 truncate">
            {user.name}
          </span>

          {/* Counter */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleDecrement}
              disabled={count === 0}
              aria-label={`Ubrat nápoj pro ${user.name}`}
              className="w-7 h-7 rounded-lg border border-outline-variant flex items-center justify-center
                active:scale-90 transition-transform hover:bg-surface-container
                disabled:opacity-30 disabled:cursor-not-allowed p-1"
            >
              <Minus className="w-3.5 h-3.5 text-on-surface-variant" />
            </button>

            <span className="text-base font-mono font-bold text-on-surface tabular-nums min-w-[20px] text-center">
              {count}
            </span>

            <button
              onClick={handleIncrement}
              disabled={!selectedDrink}
              aria-label={`Přidat nápoj pro ${user.name}`}
              className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center
                active:scale-90 transition-transform accent-shadow
                disabled:opacity-40 disabled:cursor-not-allowed p-1"
            >
              <Plus className="w-3.5 h-3.5 text-on-primary" />
            </button>
          </div>
        </div>

        {/* Drink breakdown */}
        {drinkBreakdown.length > 0 && (
          <div className="mt-3 pt-3 border-t border-outline-variant space-y-1.5">
            {drinkBreakdown.map(({ drink, count: cnt, subtotal }) => (
              <div key={drink.id} className="flex justify-between items-center">
                <span className="text-xs text-on-surface-variant truncate max-w-[60%]">
                  {cnt}× {drink.name}
                </span>
                <span className="text-xs font-mono text-outline tabular-nums">
                  {Math.round(subtotal)} Kč
                </span>
              </div>
            ))}
          </div>
        )}
      </article>
    )
  }
  ```

- [ ] **Commit**

  ```bash
  git add src/components/UserCard.tsx
  git commit -m "design: UserCard — inline avatar, counter top row, breakdown below"
  git push
  ```

---

## Task 12: `ScanModal.tsx` — Lucide icons

**Files:**
- Modify: `src/components/ScanModal.tsx`

- [ ] **Replace the two `material-symbols-outlined` spans in the file**

  In the header close button (line ~48), replace:
  ```tsx
  <span className="material-symbols-outlined text-on-surface-variant">close</span>
  ```
  with:
  ```tsx
  import { X, PlusCircle } from 'lucide-react'
  // ...
  <X className="w-5 h-5 text-on-surface-variant" />
  ```

  In the footer confirm button (line ~166), replace:
  ```tsx
  <span className="material-symbols-outlined">add_circle</span>
  ```
  with:
  ```tsx
  <PlusCircle className="w-5 h-5" />
  ```

  Also update the confirm button classes — replace `bg-primary ... border-on-primary-container text-on-primary-container` with `bg-primary text-on-primary`:
  ```tsx
  <button
    onClick={handleConfirm}
    disabled={checked.size === 0}
    className="w-full bg-primary py-4 rounded-xl text-on-primary font-bold text-base
      flex items-center justify-center gap-2 active:translate-y-0.5 transition-all accent-shadow
      disabled:opacity-40 disabled:cursor-not-allowed"
  >
    <PlusCircle className="w-5 h-5" />
    Přidat vybrané ({checked.size})
  </button>
  ```

  Add the import at the top of the file:
  ```tsx
  import { X, PlusCircle } from 'lucide-react'
  ```

- [ ] **Commit**

  ```bash
  git add src/components/ScanModal.tsx
  git commit -m "design: ScanModal — Lucide icons, olive button"
  git push
  ```

---

## Task 13: `app/page.tsx` — onboarding redesign

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Add Lucide imports** at the top of the file (after existing imports):

  ```tsx
  import { Search, MapPin, ChevronRight, Plus, Pencil } from 'lucide-react'
  ```

- [ ] **Find every `material-symbols-outlined` span and replace with Lucide**

  | Material symbol | Replace with |
  |----------------|-------------|
  | `search` | `<Search className="w-4 h-4 text-outline" />` |
  | `place` or `location_on` | `<MapPin className="w-4 h-4 text-[#a8bc00]" />` |
  | `chevron_right` | `<ChevronRight className="w-4 h-4 text-outline" />` |
  | `add` | `<Plus className="w-4 h-4" />` |
  | `edit` | `<Pencil className="w-3.5 h-3.5" />` |
  | `business` or any pub icon | `<MapPin className="w-4 h-4 text-[#a8bc00]" />` |

- [ ] **Update class names for amber → olive**

  Replace throughout:
  - `text-amber-500` → `text-[#a8bc00]`
  - `bg-beer-gradient` → `bg-primary`
  - `brewery-shadow` → `accent-shadow`
  - `rounded-2xl` on buttons → `rounded-xl`
  - `rounded-full` on avatars/icons → `rounded-lg`
  - `border-amber-` → `border-primary`

- [ ] **Update search input styling**

  Find the search `<input>` element and ensure it has:
  ```tsx
  className="flex-1 bg-transparent text-on-surface placeholder:text-outline text-sm focus:outline-none"
  ```
  And the wrapper div:
  ```tsx
  className="flex items-center gap-3 bg-surface border border-outline-variant rounded-xl px-4 py-3 mx-4"
  ```

- [ ] **Update pub list rows**

  Each pub row should follow this pattern:
  ```tsx
  <Link
    href={`/${pub.id}`}
    className="flex items-center gap-3 bg-surface border border-outline-variant rounded-xl px-4 py-3 active:scale-[0.99] transition-transform"
  >
    <div className="w-8 h-8 rounded-lg bg-primary/12 border border-primary/25 flex items-center justify-center flex-shrink-0">
      <MapPin className="w-4 h-4 text-[#a8bc00]" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-on-surface text-sm truncate">{pub.name}</p>
      {pub.address && <p className="text-xs text-outline truncate">{pub.address}</p>}
    </div>
    <ChevronRight className="w-4 h-4 text-outline flex-shrink-0" />
  </Link>
  ```

- [ ] **Update FAB / "Přidat hospodu" button**

  ```tsx
  <button
    onClick={() => setShowNewPubModal(true)}
    className="fixed bottom-6 right-4 flex items-center gap-2 bg-primary text-on-primary font-bold px-5 py-3 rounded-xl accent-shadow active:translate-y-0.5 transition-all text-sm"
    style={{ bottom: 'max(env(safe-area-inset-bottom) + 16px, 24px)' }}
  >
    <Plus className="w-4 h-4" />
    Přidat hospodu
  </button>
  ```

- [ ] **TypeScript check**

  ```bash
  npx tsc --noEmit 2>&1 | head -20
  ```

- [ ] **Commit**

  ```bash
  git add src/app/page.tsx
  git commit -m "design: onboarding — olive palette, Lucide icons"
  git push
  ```

---

## Task 14: `[pubId]/page.tsx` — counting page

**Files:**
- Modify: `src/app/[pubId]/page.tsx`

- [ ] **Add Lucide imports**

  ```tsx
  import { ArrowLeft, ScanLine, Beer, UserPlus } from 'lucide-react'
  ```

- [ ] **Update header** — replace Material Symbols spans:

  ```tsx
  <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant h-14 flex items-center px-4 justify-between"
    style={{ paddingTop: 'env(safe-area-inset-top)' }}
  >
    <div className="flex items-center gap-2.5">
      <Link
        href="/"
        className="w-9 h-9 flex items-center justify-center hover:bg-surface-container rounded-lg transition-colors active:scale-95"
        aria-label="Zpět"
      >
        <ArrowLeft className="w-5 h-5 text-on-surface-variant" />
      </Link>
      <div className="flex flex-col">
        <h1 className="text-on-surface font-bold tracking-tight text-sm leading-tight">
          {pub.name}
        </h1>
        <span className="text-outline font-mono text-[9px] uppercase tracking-widest">
          {session?.closed_at ? 'uzavřeno' : 'aktivní session'}
        </span>
      </div>
    </div>
    <div className="flex items-center gap-1">
      <ThemeToggle />
      <Link
        href={`/${params.pubId}/scan`}
        className="w-9 h-9 flex items-center justify-center hover:bg-surface-container rounded-lg transition-colors active:scale-95"
        aria-label="Skenovat ceník"
      >
        <ScanLine className="w-5 h-5 text-outline" />
      </Link>
    </div>
  </header>
  ```

- [ ] **Update `NoDrinksPrompt`**

  ```tsx
  function NoDrinksPrompt({ pubId }: { pubId: string }) {
    return (
      <div className="mt-8 text-center py-8 space-y-3">
        <Beer className="w-10 h-10 text-outline mx-auto" />
        <p className="text-on-surface-variant text-sm">Zatím žádné nápoje.</p>
        <Link
          href={`/${pubId}/scan`}
          className="inline-flex items-center gap-2 bg-primary text-on-primary font-bold px-5 py-2.5 rounded-xl accent-shadow text-sm"
        >
          <ScanLine className="w-4 h-4" />
          Skenovat ceník
        </Link>
      </div>
    )
  }
  ```

- [ ] **Update `NoUsersPrompt`**

  ```tsx
  function NoUsersPrompt({ pubId }: { pubId: string }) {
    return (
      <div className="mt-8 text-center py-8 space-y-3">
        <UserPlus className="w-10 h-10 text-outline mx-auto" />
        <p className="text-on-surface-variant text-sm">Nikdo u stolu. Přidej lidi!</p>
        <Link
          href={`/${pubId}/users`}
          className="inline-flex items-center gap-2 bg-primary text-on-primary font-bold px-5 py-2.5 rounded-xl accent-shadow text-sm"
        >
          <UserPlus className="w-4 h-4" />
          Přidat lidi
        </Link>
      </div>
    )
  }
  ```

- [ ] **Update error state** — replace `material-symbols-outlined` with:

  ```tsx
  import { AlertCircle } from 'lucide-react'
  // ...
  <AlertCircle className="w-10 h-10 text-error mx-auto" />
  ```

- [ ] **Commit**

  ```bash
  git add src/app/[pubId]/page.tsx
  git commit -m "design: counting page — olive palette, Lucide icons"
  git push
  ```

---

## Task 15: `account/page.tsx` — olive total card + breakdown

**Files:**
- Modify: `src/app/[pubId]/account/page.tsx`

- [ ] **Add Lucide imports**

  ```tsx
  import { ArrowLeft, Receipt, CheckCircle, Trash2 } from 'lucide-react'
  ```

- [ ] **Replace `getAvatarClasses` with `getAvatarStyle`**

  Change import:
  ```tsx
  import { getAvatarStyle, getInitials } from '@/lib/colors'
  ```

- [ ] **Update header** — replace arrow back icon:

  ```tsx
  <ArrowLeft className="w-5 h-5 text-on-surface-variant" />
  ```
  Remove `text-amber-500` from pub name, use `text-on-surface`.

- [ ] **Replace total summary card** with olive card:

  ```tsx
  <div className="bg-primary rounded-2xl p-5">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-on-primary/60 font-mono text-[10px] uppercase tracking-widest mb-1">
          {isClosed ? 'Uzavřená útrata' : 'Celková útrata'}
        </p>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-mono font-black text-on-primary tabular-nums">
            {Math.round(sessionTotal)}
          </span>
          <span className="text-on-primary font-bold">Kč</span>
        </div>
        <p className="text-on-primary/60 text-xs mt-0.5">
          {sessionDrinkCount}{' '}
          {sessionDrinkCount === 1 ? 'nápoj' : sessionDrinkCount < 5 ? 'nápoje' : 'nápojů'}
        </p>
      </div>
      <Receipt className="w-8 h-8 text-on-primary/20" />
    </div>
  </div>
  ```

- [ ] **Update per-person cards** — use `getAvatarStyle` inline styles:

  ```tsx
  {users.map((user) => {
    const av = getAvatarStyle(user.name)
    const breakdown = userDrinkBreakdown(user.id)
    const total = userTotal(user.id)
    if (breakdown.length === 0) return null
    return (
      <div key={user.id} className="bg-surface border border-outline-variant rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-8 h-8 rounded-lg border flex items-center justify-center font-bold text-xs flex-shrink-0"
            style={{ backgroundColor: av.bg, color: av.color, borderColor: av.border }}
            aria-hidden
          >
            {getInitials(user.name)}
          </div>
          <span className="font-semibold text-on-surface text-sm flex-1">{user.name}</span>
          <span className="font-mono font-bold text-on-surface text-sm tabular-nums">
            {Math.round(total)} Kč
          </span>
        </div>
        <div className="space-y-1.5 pt-3 border-t border-outline-variant">
          {breakdown.map(({ drink, count, subtotal }) => (
            <div key={drink.id} className="flex justify-between items-center">
              <span className="text-xs text-on-surface-variant">
                {count}× {drink.name}
              </span>
              <span className="text-xs font-mono text-outline tabular-nums">
                {Math.round(subtotal)} Kč
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  })}
  ```

- [ ] **Update close session button**

  ```tsx
  <button
    onClick={() => setShowConfirm(true)}
    className="w-full py-3.5 bg-error/10 text-error border border-error/30 font-bold rounded-xl active:translate-y-0.5 transition-all flex items-center justify-center gap-2 text-sm"
  >
    <Trash2 className="w-4 h-4" />
    Uzavřít účet
  </button>
  ```

- [ ] **Update modal confirm button** — replace `bg-beer-gradient`:

  ```tsx
  className="flex-1 bg-primary text-on-primary font-bold py-3 rounded-xl active:translate-y-0.5 transition-all disabled:opacity-40 text-sm"
  ```

- [ ] **Update isClosed state** — replace Material Symbols:

  ```tsx
  <CheckCircle className="w-6 h-6 text-primary mx-auto" />
  ```

- [ ] **Commit**

  ```bash
  git add src/app/[pubId]/account/page.tsx
  git commit -m "design: account page — olive card, per-person breakdown, Lucide"
  git push
  ```

---

## Task 16: Remaining pages — icons + token pass

**Files:**
- Modify: `src/app/[pubId]/settings/page.tsx`
- Modify: `src/app/[pubId]/users/page.tsx`
- Modify: `src/app/[pubId]/scan/page.tsx`

### settings/page.tsx

- [ ] **Add Lucide imports**

  ```tsx
  import { ArrowLeft, Pencil, Trash2, Plus, ScanLine, Save } from 'lucide-react'
  ```

- [ ] **Replace all `material-symbols-outlined` spans** using this mapping:

  | Material | Lucide |
  |----------|--------|
  | `arrow_back` | `<ArrowLeft className="w-5 h-5 text-on-surface-variant" />` |
  | `edit` | `<Pencil className="w-4 h-4" />` |
  | `delete` | `<Trash2 className="w-4 h-4" />` |
  | `add` | `<Plus className="w-4 h-4" />` |
  | `qr_code_scanner` or `photo_camera` | `<ScanLine className="w-4 h-4" />` |
  | `save` | `<Save className="w-4 h-4" />` |

- [ ] **Replace amber/beer tokens** — `bg-beer-gradient` → `bg-primary`, `text-amber-` → `text-[#a8bc00]`, `brewery-shadow` → `accent-shadow`, `rounded-2xl` buttons → `rounded-xl`

- [ ] **Commit settings**

  ```bash
  git add src/app/[pubId]/settings/page.tsx
  git commit -m "design: settings — Lucide icons, olive tokens"
  git push
  ```

### users/page.tsx

- [ ] **Add Lucide imports**

  ```tsx
  import { ArrowLeft, UserPlus, Pencil, Trash2, Check, X } from 'lucide-react'
  ```

- [ ] **Replace `getAvatarClasses` with `getAvatarStyle`**

  ```tsx
  import { getAvatarStyle, getInitials } from '@/lib/colors'
  // usage:
  const av = getAvatarStyle(user.name)
  // in JSX:
  <div
    className="w-10 h-10 rounded-lg border flex items-center justify-center font-bold text-sm flex-shrink-0"
    style={{ backgroundColor: av.bg, color: av.color, borderColor: av.border }}
  >
    {getInitials(user.name)}
  </div>
  ```

- [ ] **Replace all `material-symbols-outlined` spans** using this mapping:

  | Material | Lucide |
  |----------|--------|
  | `arrow_back` | `<ArrowLeft className="w-5 h-5 text-on-surface-variant" />` |
  | `person_add` | `<UserPlus className="w-4 h-4" />` |
  | `edit` | `<Pencil className="w-3.5 h-3.5" />` |
  | `delete` / `close` | `<Trash2 className="w-3.5 h-3.5" />` or `<X className="w-3.5 h-3.5" />` |
  | `check` | `<Check className="w-4 h-4" />` |

- [ ] **Replace amber tokens** — same as above.

- [ ] **Commit users**

  ```bash
  git add src/app/[pubId]/users/page.tsx
  git commit -m "design: users page — Lucide icons, earthy avatars, olive tokens"
  git push
  ```

### scan/page.tsx

- [ ] **Add Lucide imports**

  ```tsx
  import { ArrowLeft, Camera, ImagePlus, ScanLine, Loader2 } from 'lucide-react'
  ```

- [ ] **Replace `material-symbols-outlined` spans**:

  | Material | Lucide |
  |----------|--------|
  | `arrow_back` | `<ArrowLeft className="w-5 h-5 text-on-surface-variant" />` |
  | `photo_camera` | `<Camera className="w-6 h-6" />` |
  | `image` or `photo_library` | `<ImagePlus className="w-6 h-6" />` |
  | `qr_code_scanner` | `<ScanLine className="w-6 h-6" />` |

- [ ] **Replace amber tokens** — `bg-beer-gradient` → `bg-primary`, `brewery-shadow` → `accent-shadow`, button rounding → `rounded-xl`

- [ ] **Commit scan**

  ```bash
  git add src/app/[pubId]/scan/page.tsx
  git commit -m "design: scan page — Lucide icons, olive tokens"
  git push
  ```

---

## Task 17: Final verification

- [ ] **Run TypeScript check**

  ```bash
  cd c:/projekty/Hospoda.pro && npx tsc --noEmit 2>&1
  ```
  Expected: 0 errors. Fix any remaining `getAvatarClasses` references (rename to `getAvatarStyle` everywhere).

- [ ] **Start dev server and verify visually**

  ```bash
  npm run dev
  ```

  Open http://localhost:3000 and check:
  - [ ] Onboarding: olive FAB, pub rows with rounded-xl, MapPin icons
  - [ ] Counting page: vertical drink list, user cards with breakdown below counter
  - [ ] BottomNav: floating card, rounded-2xl, active tab olive square icon
  - [ ] Account page: olive total card, per-person breakdown with earthy avatars
  - [ ] ThemeToggle: Moon/Sun visible, no Material Symbols anywhere
  - [ ] Scan page: Camera/ImagePlus icons

- [ ] **Final commit if any fixes were needed**

  ```bash
  git add -A
  git commit -m "fix: resolve remaining Material Symbols / amber token references"
  git push
  ```

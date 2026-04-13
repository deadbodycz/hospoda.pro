# CLAUDE.md — hospoda.pro

Tento soubor řídí chování Claude Code v tomto projektu. Čti ho celý před každou změnou kódu.

---

## Produkt

**hospoda.pro** — Mobilní PWA pro sledování vypitých nápojů ve skupině.

- **Doména:** hospoda.pro (registrovaná na Forpsi, DNS → Vercel nameservery)
- **Repo:** https://github.com/deadbodycz/hospoda.pro.git
- **Hosting:** Vercel (automatický deploy z `main` branche)
- **DB:** Supabase (PostgreSQL)
- **AI:** Anthropic API — claude-sonnet-4-6 (vision pro skenování ceníku)

---

## Stack

| Vrstva | Technologie |
|--------|-------------|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS v3 |
| Ikony | Material Symbols Outlined (Google Fonts) |
| Fonty | Geist Sans, Geist Mono, Work Sans (Google Fonts) |
| DB client | @supabase/supabase-js |
| AI | Anthropic SDK (@anthropic-ai/sdk) |
| State | React useState / useContext + useReducer v SessionContext (žádný Zustand) |
| Auth | Supabase Auth (anonymní session nebo email magic link) |
| Image opt. | sharp (devDependency, Next.js image optimization) |

---

## Vizuální reference — Stitch design

Složka `/public/navrh/` obsahuje fotky a obrázky od uživatele (design reference, screenshoty). Prohledej ji, pokud uživatel zmiňuje "návrh", "design" nebo "předlohu".

Složka `/design/stitch/` obsahuje HTML exporty z Google Stitch. Jsou to **pixel-perfect předlohy** — neimportuj je, ale dodržuj z nich přesně třídy, tokeny, spacing a komponenty.

```
design/
└── stitch/
    ├── onboarding_pub_selection.html   ← Výběr hospody, search, recent pubs, FAB, bottom nav
    ├── scan_edit_menu.html             ← Split screen kamera/galerie, processing overlay, modal s checkboxy
    ├── add_users_table_setup.html      ← Avatar scroll, "+ Add Person", karty uživatelů u stolu
    └── draught_counter.html            ← HLAVNÍ OBRAZOVKA: chip scroll, user cards, +/- counter, summary bar
```

### Co Stitch skutečně vygeneroval (přesné třídy — kopíruj 1:1):

**Fonty ve skutečném výstupu:**
- Onboarding: `Space Grotesk` (headline/label) + `Work Sans` (body) + `Geist Mono` (mono)
- Scan & Users: `Space Grotesk` / `Geist Sans` + `Work Sans` + `Geist Mono`
- Draught Counter: **`Geist`** (sans + headline + body) + `Geist Mono` (mono/label) ← tento soubor je nejnovější, drž se jeho fontů

**Skutečné CSS utility z Stitch:**
```css
.beer-gradient { background: linear-gradient(180deg, #ffbe5b 0%, #e8a020 100%); }
.brewery-shadow { box-shadow: 0 4px 24px rgba(232, 160, 32, 0.15); }
.grain-texture { /* SVG noise, opacity: 0.05, pointer-events: none */ }
::-webkit-scrollbar { display: none; }
body { -ms-overflow-style: none; scrollbar-width: none; }
```

**Bottom nav — skutečná implementace z Stitch (draught_counter.html):**
- Výška: `h-20` (80px), ne 64px
- Pozadí: `bg-zinc-900/80 backdrop-blur-xl`
- Border: `border-t-2 border-zinc-800/20`
- Aktivní tab: amber background pill + label pod ikonou
- Labely: `font-mono text-[10px] uppercase tracking-widest`

**Header — skutečná implementace:**
- Výška: `h-16` na draught_counter, `h-12` na ostatních
- Pozadí: `bg-zinc-900/60` nebo `bg-zinc-950/60 backdrop-blur-md`
- Border: `border-b-2 border-zinc-800/20`
- Dark mode toggle: ikona `dark_mode` (Material Symbols)

**User karty — skutečné třídy:**
```html
<article class="bg-surface-container-low rounded-xl p-5 border-2 border-transparent hover:border-outline-variant/20">
```
Pozor: Stitch použil `rounded-xl` (ne `rounded-3xl`) na kartách v draught_counter!

**Avatar circle — skutečná implementace:**
```html
<div class="w-12 h-12 rounded-full bg-amber-500/20 text-amber-500 border-2 border-amber-500/30">M</div>
```

**+/- tlačítka — skutečné třídy:**
```html
<!-- Minus -->
<button class="w-14 h-14 rounded-2xl border-2 border-outline flex items-center justify-center active:scale-90 transition-transform">
<!-- Plus -->  
<button class="w-14 h-14 rounded-2xl bg-beer-gradient text-on-primary-container brewery-shadow active:translate-y-0.5">
```

**Chip scroll — skutečné třídy:**
```html
<section class="flex overflow-x-auto gap-2 pb-6 pt-2 sticky top-16 bg-background/95 backdrop-blur-sm z-40 -mx-4 px-4">
<!-- Aktivní chip -->
<button class="flex-shrink-0 px-5 py-2.5 bg-beer-gradient rounded-full border-2 border-primary-container shadow-lg">
<!-- Neaktivní chip -->
<button class="flex-shrink-0 px-5 py-2.5 bg-surface-container border-2 border-outline-variant text-on-surface-variant rounded-full">
```

**Summary bar — skutečné třídy:**
```html
<aside class="fixed bottom-24 left-4 right-4 z-40 bg-zinc-900 border-2 border-zinc-800/40 rounded-xl p-4 shadow-2xl">
```

---

## Architektura projektu

```
src/
├── app/
│   ├── layout.tsx               ← Root layout, PWA meta, ThemeProvider
│   ├── page.tsx                 ← Onboarding / výběr hospody + editace hospody
│   ├── globals.css              ← Tailwind imports, custom CSS utility třídy
│   ├── [pubId]/
│   │   ├── layout.tsx           ← Wrapper pro SessionProvider (pubId → context)
│   │   ├── page.tsx             ← Hlavní counting obrazovka (DraughtCounter UI)
│   │   ├── account/page.tsx     ← Přehled účtu, rozpis po osobách, uzavření session
│   │   ├── settings/page.tsx    ← Editace hospody + správa ceníku (edit/smazat nápoj)
│   │   ├── scan/page.tsx        ← Skenování ceníku
│   │   └── users/page.tsx       ← Přidání a editace uživatelů ke stolu
│   └── api/
│       └── scan/route.ts        ← API route pro Anthropic vision
├── components/
│   ├── ui/
│   │   ├── Modal.tsx            ← Základní modal (backdrop, drag-to-close)
│   │   └── Toast.tsx            ← Toast + useToast hook (ToastProvider)
│   ├── BottomNav.tsx            ← Spodní navigace (pubId prop, aktivní tab)
│   ├── DrinkChips.tsx           ← Vertikální seznam nápojů pro výběr
│   ├── ScanModal.tsx            ← Modal s výsledky AI skenování (checkboxy)
│   ├── ThemeToggle.tsx          ← Tlačítko pro přepínání dark/light módu
│   └── UserCard.tsx             ← Karta uživatele s +/- counterem
├── contexts/
│   ├── SessionContext.tsx       ← Hlavní state (useReducer): pub, session, drinks, users, logs
│   └── ThemeContext.tsx         ← Dark/light theme (localStorage sync)
├── lib/
│   ├── supabase.ts              ← Supabase client (singleton)
│   ├── anthropic.ts             ← Anthropic helper (komprimace + API call)
│   ├── colors.ts                ← Deterministická generace barvy avataru z jména
│   └── haptics.ts               ← navigator.vibrate wrapper
└── types/
    └── index.ts                 ← Pub, Drink, Session, SessionUser, DrinkLog, ScannedItem
```

### Klíčové implementační detaily:

- **SessionContext** (`contexts/SessionContext.tsx`) — centrální state celé pub session. Používá `useReducer` s explicitními akcemi. Obsahuje optimistické aktualizace pro `incrementDrink` (temp ID → nahrazení reálným po DB response). Exponuje: `addUser`, `removeUser`, `updateUser`, `addDrinks`, `updateDrink`, `removeDrink`, `updatePub`, `incrementDrink`, `decrementDrink`, `closeSession`, `drinkCount`, `userTotal`, `userDrinkBreakdown`, `sessionTotal`, `sessionDrinkCount`, `lastDrink`. Exportuje typ `DrinkBreakdownItem { drink, count, subtotal }`.
- **`[pubId]/layout.tsx`** — Server Component wrapper, který obaluje celou pub sekci do `<SessionProvider pubId={params.pubId}>`.
- **Soubory komponent** jsou PascalCase (např. `UserCard.tsx`, `BottomNav.tsx`), ne kebab-case.

---

## Design systém — "The Digital Draught"

### Pravidla, která NIKDY neporušuj:

1. **Žádné 1px linky.** Separace pouze barvou pozadí nebo `border-2 border-outline-variant/20`
2. **Žádné čisté bílé v dark mode.** Maximum: `#F0EDE6` (Cream)
3. **Žádné drop-shadow na kartách.** Hierarchie přes barvu pozadí + ghost border
4. **Čísla vždy Geist Mono + `tabular-nums`**
5. **Karty vždy `rounded-3xl`**, tlačítka `rounded-2xl`
6. **Primary tlačítka vždy `beer-gradient`** — `linear-gradient(180deg, #ffbe5b 0%, #e8a020 100%)`
7. **Press state tlačítek: `active:translate-y-[2px]`** — fyzický klik pocit

### Tailwind color tokeny (dark mode výchozí):
```
surface:                  #131412
surface-container:        #1f201e
surface-container-low:    #1b1c1a
surface-container-high:   #292a28
surface-container-highest:#343533
surface-variant:          #343533
surface-bright:           #393937
on-surface:               #e4e2de
on-surface-variant:       #d6c4ae
primary:                  #ffbe5b
primary-container:        #e8a020
on-primary:               #442b00
on-primary-container:     #5b3b00
outline:                  #9e8e7a
outline-variant:          #514534
error:                    #ffb4ab
error-container:          #93000a
```

### Light mode (třída `.light` na `<html>`):
```
surface:                  #F7F5F0
surface-container-highest:#FFFFFF
on-surface:               #1A1916
primary:                  #C4780A    ← tmavší zlatá — kontrast na světlém
```

### Dark/Light mode přepínání:
- `darkMode: "class"` v `tailwind.config.js`
- Toggle ukládá preference do `localStorage` klíč `theme`
- Výchozí: `prefers-color-scheme` → fallback na `dark`
- Třída `dark` nebo `light` se přidává na `<html>` element
- Přechod: `transition-colors duration-300` na `body`

---

## Klíčové UX pravidla

### Mobile-first absolutně
- Touch targets: **min 48×48px** pro vše interaktivní
- Bottom nav: `h-20` (80px) + `pb-[env(safe-area-inset-bottom)]` — iPhone home bar
- Sticky header: `padding-top: env(safe-area-inset-top)`
- Scrollovatelné listy: `overflow-y-auto` s `max-h` pro dlouhé seznamy
- Overscroll v modalech: `overscroll-behavior: contain`
- Nepoužívej `h-screen` — vždy `min-h-[100dvh]`

### +/- Counter (nejkritičtější komponenta)
```tsx
// Minimální implementace
const [count, setCount] = useState(0)

// Minus tlačítko disabled při count === 0
// Haptic feedback na každý tap
// Press animace: active:translate-y-[2px] transition-transform duration-75
// Vibrace: navigator.vibrate && navigator.vibrate(10)
```

### Haptic feedback
Každý tap na `+` nebo `−` spouští `navigator.vibrate(10)`. Wrapper v `lib/haptics.ts`:
```ts
export const haptic = (ms = 10) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(ms)
  }
}
```

---

## AI skenování ceníku

### API Route: `/api/scan`
```ts
// Vstup: FormData s klíčem "image" (File)
// Výstup: JSON { items: Array<{ name: string, priceSmall: number, priceLarge: number }> }
```

### Komprimace obrázku (client side, před odesláním):
```ts
// Max 1500px na delší straně
// JPEG kvalita 0.82
// Canvas API pro resize
// Pak jako base64 nebo Blob do FormData
```

### Anthropic Vision prompt (v `lib/anthropic.ts`):
```
Jsi asistent pro restaurace. Z přiloženého obrázku ceníku nápojů extrahuj seznam nápojů.
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
```

### Po skenování — Modal s checkboxy:
- Každá položka: checkbox (výchozí: zaškrtnuto) + název + cena
- Inline editace: tap na řádek → `<input>` pro název a cenu
- Tlačítko „Přidat vybrané" — sticky dole v modalu

---

## Supabase schéma

```sql
-- Hospody
create table pubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  created_at timestamptz default now()
);

-- Nápoje / ceník hospody
create table drinks (
  id uuid primary key default gen_random_uuid(),
  pub_id uuid references pubs(id) on delete cascade,
  name text not null,
  price_small numeric(8,2),
  price_large numeric(8,2),
  created_at timestamptz default now()
);

-- Relace uživatel × session
create table sessions (
  id uuid primary key default gen_random_uuid(),
  pub_id uuid references pubs(id),
  created_at timestamptz default now(),
  closed_at timestamptz
);

-- Uživatelé v session
create table session_users (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  name text not null,
  avatar_color text not null  -- tailwind color name
);

-- Záznamy nápojů
create table drink_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  session_user_id uuid references session_users(id) on delete cascade,
  drink_id uuid references drinks(id),
  quantity integer not null default 1,
  unit_price numeric(8,2) not null,
  logged_at timestamptz default now()
);
```

---

## Prostředí — Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
ANTHROPIC_API_KEY=...          # pouze server-side, nikdy NEXT_PUBLIC_
```

**Nikdy neposílej `ANTHROPIC_API_KEY` na klienta.** Vždy přes `/api/scan` route.

---

## 🚀 GIT WORKFLOW

**Po každé změně kódu vždy automaticky:**

```bash
git add -A
git commit -m "stručný popis změny v češtině"
git push
```

**Pravidla:**
- **NIKDY nečekej na pokyn k pushnutí** — push provádej automaticky po dokončení každé úpravy
- Commit message piš česky, stručně a výstižně (např. `fix: počasí z EXIF datetime`, `feat: export PDF záznamů`)
- Po úspěšném push oznam uživateli, že změny jsou na GitHubu a Vercel deploy byl spuštěn

---

## 🗃️ DATABÁZOVÉ MIGRACE — WORKFLOW

Migrace jsou v `supabase/migrations/`. Supabase CLI je dostupné přes `npx supabase`.

**VŽDY postupuj takto při změně DB:**

```bash
# 1. Vytvoř SQL soubor
# supabase/migrations/NNN_popis.sql

# 2. Spusť migraci přímo (bez čekání na uživatele)
npx supabase db push --db-url "postgresql://postgres.[ref]:[heslo]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

# 3. Commitni a pushni (automaticky, bez čekání na pokyn)
git add supabase/migrations/NNN_popis.sql
git commit -m "migration: popis změny"
git push
```

Kde:
- `[ref]` = project reference z `NEXT_PUBLIC_SUPABASE_URL` (část mezi `https://` a `.supabase.co`)
- `[heslo]` = z `.env.local` klíč `SUPABASE_DB_PASSWORD`

**Přidej do `.env.local`** (nikdy necommitovat):
```bash
SUPABASE_DB_PASSWORD=heslo-z-dashboardu
```

**NIKDY neříkej uživateli "spusť v SQL Editoru"** — vždy spusť sám přes CLI.

---

## i18n a lokalizace

- **Jazyk UI:** čeština všude
- **Datum:** `DD.MM.YYYY` (česká konvence)
- **Čas:** `HH:MM`
- **Timezone:** `Europe/Prague`
- **Ceny:** `${cena} Kč` (celé číslo, bez desetinných míst pokud .00)
- **Čísla:** české oddělovače — tisíce mezerou: `1 258 Kč`
- **Chybové hlášky:** česky, přátelsky — ne technicky
  - Špatně: „Error: Failed to fetch"
  - Dobře: „Nepodařilo se načíst ceník. Zkus to znovu."

---

## Toast notifikace

Pozice: horní střed (pod status barem), `z-50`

```
Úspěch: bg zelená, text bílý, ikona check_circle
Chyba:  bg červená, text bílý, ikona error
Info:   bg surface-container-highest, border, text on-surface
```

Auto-dismiss: 3 sekundy. Animace: slide-down + fade-in.

---

## PWA konfigurace

`public/manifest.json`:
```json
{
  "name": "Hospoda.pro",
  "short_name": "Hospoda",
  "description": "Sleduj, kolik jsi v hospodě vypil",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#131412",
  "theme_color": "#131412",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

---

## Kódové standardy

- **TypeScript strict mode** — žádné `any`
- **Komponenty:** PascalCase — soubory i export. Skutečná konvence v projektu: `UserCard.tsx`, `BottomNav.tsx` (PascalCase, ne kebab-case)
- **Server Components výchozí** — `"use client"` pouze kde je nutné (interaktivita, hooks)
- **Žádné inline styly** — výhradně Tailwind třídy
- **Žádné `console.log` v produkci** — použij podmínku `process.env.NODE_ENV === 'development'`
- **Error boundaries** kolem AI-dependent komponent
- **Loading states** vždy — skeleton loader, ne spinner

---

## Co nedělat (zakázáno)

- ❌ `h-screen` — vždy `min-h-[100dvh]`
- ❌ 1px border jako separator — vždy barva pozadí nebo `border-2`
- ❌ `#FFFFFF` v dark mode — max `#F0EDE6`
- ❌ Drop-shadow na kartách
- ❌ `ANTHROPIC_API_KEY` na klientu
- ❌ Celé stránky jako Client Components — jen interaktivní části
- ❌ `any` TypeScript typ
- ❌ Emoji v UI — pouze ikony (Material Symbols)
- ❌ Anglické texty v UI — vše česky

---

## Co je hotové

- ✅ Root layout s ThemeProvider + PWA meta + Google Fonts
- ✅ PWA ikony (`public/icon-192.png`, `public/icon-512.png`) + `public/manifest.json`
- ✅ Onboarding stránka — search, list hospod, skeleton loader, FAB, modal pro novou hospodu + editace hospody
- ✅ SessionContext — celý state management (useReducer), optimistické aktualizace logů, CRUD pro pub/drinks/users
- ✅ ThemeContext — dark/light přepínání s localStorage persistencí
- ✅ `[pubId]/layout.tsx` — SessionProvider wrapper
- ✅ Hlavní counting stránka (`[pubId]/page.tsx`) — vertikální seznam nápojů, UserCard s rozpisem pití
- ✅ `[pubId]/account/page.tsx` — přehled útrat po osobách, uzavření session
- ✅ `[pubId]/settings/page.tsx` — editace hospody, editace/mazání nápojů, odkaz na sken
- ✅ `[pubId]/scan/page.tsx` — skenování ceníku (AI vision)
- ✅ `[pubId]/users/page.tsx` — přidání, editace a odebrání uživatelů
- ✅ API route `/api/scan` — Anthropic vision
- ✅ Komponenty: BottomNav (s Account+Settings routami), DrinkChips (vertikální seznam), UserCard (drink breakdown), ScanModal, ThemeToggle
- ✅ UI primitiva: Modal, Toast (s useToast hookem a ToastProvider)
- ✅ Lib: supabase, anthropic, colors, haptics
- ✅ Typy: Pub, Drink, Session, SessionUser, DrinkLog, ScannedItem, DrinkBreakdownItem
- ✅ Supabase migrace: `supabase/migrations/001_initial_schema.sql`
- ✅ Deploy na Vercel (hospoda-pro.vercel.app), GitHub auto-deploy z `main`

## Co zbývá implementovat

- ⬜ Doména hospoda.pro → nasměrovat na nový Vercel projekt (čeká se na DNS ověření)
- ⬜ Service worker / offline podpora
- ⬜ Supabase Auth integrace (zatím se nepřihlašuje — anonymní přístup)
- ⬜ Error boundaries kolem AI-dependent komponent
- ⬜ Testování na reálném iOS (haptic, safe-area, PWA install)

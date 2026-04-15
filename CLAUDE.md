# CLAUDE.md — hospoda.pro

Tento soubor řídí chování Claude Code v tomto projektu. Čti ho celý před každou změnou kódu.

---

## Produkt

**hospoda.pro** — Mobilní PWA pro sledování vypitých nápojů ve skupině.

- **Doména:** hospoda.pro (registrovaná na Forpsi, DNS → Vercel nameservery)
- **Repo:** https://github.com/deadbodycz/hospoda.pro.git
- **Hosting:** Vercel (automatický deploy z `main` branche)
- **DB:** Supabase (PostgreSQL)
- **AI:** Google Cloud Vision API (OCR) + Anthropic API claude-sonnet-4-6 (parsing textu)

---

## Stack

| Vrstva | Technologie |
|--------|-------------|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS v3 |
| Ikony | lucide-react |
| Fonty | Geist Sans, Geist Mono (Google Fonts) |
| DB client | @supabase/supabase-js |
| AI — OCR | Google Cloud Vision REST API (DOCUMENT_TEXT_DETECTION) |
| AI — parsing | Anthropic SDK (@anthropic-ai/sdk), model claude-sonnet-4-6 |
| State | React useState / useContext + useReducer v SessionContext (žádný Zustand) |
| Auth | Supabase Auth (anonymní session nebo email magic link) |
| Image opt. | sharp (devDependency, Next.js image optimization) |
| Mapa | maplibre-gl@^5.23.0 (vektorové dlaždice, module-level import, SSR: false via dynamic) |
| Mapová data | MapTiler tiles (dataviz-dark/dataviz styly) + Overpass API fallback; vyhledávání hospod přes `lib/maptiler-places.ts` |

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

⚠️ **Stitch předlohy jsou historické** — design byl kompletně přepsán na olivovou paletu (viz sekce Design systém níže). Stitch HTML soubory slouží jen jako referenční layout, ne jako zdroj barev nebo ikon.

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
│       ├── scan/route.ts        ← API route pro Anthropic vision
│       └── overpass/route.ts    ← Proxy na Overpass API (rate limit, cache)
├── components/
│   ├── ui/
│   │   ├── Modal.tsx            ← Základní modal (backdrop, drag-to-close)
│   │   └── Toast.tsx            ← Toast + useToast hook (ToastProvider)
│   ├── BottomNav.tsx            ← Spodní navigace (pubId prop, aktivní tab)
│   ├── DrinkChips.tsx           ← Vertikální seznam nápojů pro výběr
│   ├── ManualPubAddModal.tsx    ← Modal pro ruční vytvoření hospody (Supabase insert, z-[80])
│   ├── PubFinderMap.tsx         ← MapLibre GL mapa (Client Component, SSR: false), olivové circle markery
│   ├── PubFinderModal.tsx       ← Full-screen overlay: mapa + seznam hospod + empty state s ManualPubAddModal
│   ├── ScanModal.tsx            ← Modal s výsledky AI skenování (checkboxy)
│   ├── ThemeToggle.tsx          ← Tlačítko pro přepínání dark/light módu
│   └── UserCard.tsx             ← Karta uživatele s +/- counterem
├── contexts/
│   ├── SessionContext.tsx       ← Hlavní state (useReducer): pub, session, drinks, users, logs
│   └── ThemeContext.tsx         ← Dark/light theme (localStorage sync)
├── lib/
│   ├── supabase.ts              ← Supabase client (singleton)
│   ├── googleVision.ts          ← Google Cloud Vision REST API wrapper (OCR)
│   ├── anthropic.ts             ← parseMenuText(ocrText) — Claude parsuje text z OCR
│   ├── colors.ts                ← getAvatarStyle(name) → { bg, color, border } CSS hodnoty
│   ├── haptics.ts               ← navigator.vibrate wrapper
│   ├── maptiler-style.ts        ← getMapStyle(theme, apiKey) → MapTiler style URL (dataviz-dark / dataviz)
│   ├── maptiler-places.ts       ← searchPubsNearby(bounds) → OsmPub[] přes MapTiler Places API + fallback Overpass
│   └── overpass.ts              ← searchPubsNearby(bounds) — klientský wrapper na /api/overpass s 5min cache
└── types/
    └── index.ts                 ← Pub, Drink, Session, SessionUser, DrinkLog, ScannedItem, OsmPub, OverpassElement, Bounds, MapBounds, MapPub
```

### Klíčové implementační detaily:

- **SessionContext** (`contexts/SessionContext.tsx`) — centrální state celé pub session. Používá `useReducer` s explicitními akcemi. Obsahuje optimistické aktualizace pro `incrementDrink` (temp ID → nahrazení reálným po DB response). Exponuje: `addUser`, `removeUser`, `updateUser`, `addDrinks`, `updateDrink`, `removeDrink`, `clearAllDrinks`, `updatePub`, `incrementDrink`, `decrementDrink`, `closeSession`, `drinkCount`, `userTotal`, `userDrinkBreakdown`, `sessionTotal`, `sessionDrinkCount`, `lastDrink`. Exportuje typ `DrinkBreakdownItem { drink, count, subtotal }`.
- **`clearAllDrinks`** — smaže všechny nápoje daného pubu z DB (`DELETE FROM drinks WHERE pub_id = ...`). Funguje díky `ON DELETE SET NULL` na `drink_logs.drink_id` — záznamy pití zůstanou (účet je přesný), jen ztratí odkaz na konkrétní nápoj.
- **`DrinkLog.drink_id`** je `string | null` — po smazání nápoje se nastaví na null. `userDrinkBreakdown` tyto záznamy přeskočí (`if (!drink || !log.drink_id) continue`), ale `userTotal` a `sessionTotal` je stále zahrnují (pracují jen s `unit_price`).
- **`[pubId]/layout.tsx`** — Server Component wrapper, který obaluje celou pub sekci do `<SessionProvider pubId={params.pubId}>`.
- **Soubory komponent** jsou PascalCase (např. `UserCard.tsx`, `BottomNav.tsx`), ne kebab-case.
- **`lib/colors.ts`** — exportuje `getAvatarStyle(name: string): AvatarStyle` a `getInitials(name)`. `AvatarStyle = { bg, color, border }` jsou CSS rgba/hex hodnoty pro inline `style={}`. **Nepoužívej Tailwind třídy pro avatary** — použij `style={{ backgroundColor: av.bg, color: av.color, borderColor: av.border }}`.
- **`session_users.avatar_color`** — sloupec sice existuje, ale ukládá se do něj **jméno uživatele** (ne Tailwind barva). Barva avataru se derivuje deterministicky z jména za běhu přes `getAvatarStyle(user.name)`.
- **`/api/scan` route** — čte `base64` (string) z FormData, **ne** `image` (File). Má `export const maxDuration = 60`. Tok: base64 → Google Vision OCR → Claude parseMenuText → items JSON. Claude odpovědi stripuje markdown code fences před JSON.parse.
- **Onboarding `page.tsx`** — smazání hospody volá `supabase.from('pubs').delete().eq('id', id)`, poté `await loadPubs()` + `router.refresh()` pro synchronizaci s DB (obchází Next.js router cache). Stránka má `visibilitychange` listener pro re-fetch při návratu ze záložky nebo mobilního přepínání.
- **Next.js router cache** — Client Component `page.tsx` na `/` může být cachovaný. Po každé mutaci dat (create/delete pub) volej `await loadPubs()` + `router.refresh()`, jinak se stará data vrátí po navigaci zpět.
- **`PubFinderMap.tsx`** — MapLibre GL se importuje na úrovni modulu (`import maplibregl from 'maplibre-gl'`). To je bezpečné, protože komponenta se vždy načítá přes `dynamic(() => import(...), { ssr: false })` z `PubFinderModal` — modul se nikdy nevyhodnocuje na serveru. Mapa se ihned zobrazí na Praze, po geolokaci se flyTo na skutečnou polohu. Cleanup: `cancelled = true` + `map.remove()` + `mapRef.current = null`.
- **MapLibre style switching** — volání `map.setStyle()` odstraní všechny vlastní zdroje a vrstvy. Proto `PubFinderMap` naslouchá na `map.on('style.load', ...)` a po každém přepnutí stylu znovu zavolá `addPubLayers(map)` + obnoví data z `currentPubsRef`. Nikdy nevolej `setStyle()` bez tohoto handleru.
- **`lib/maptiler-places.ts`** — primárně volá MapTiler Places API (`api.maptiler.com/geocoding/...`). Pokud klíč chybí nebo API selže, fallback na Overpass. Rozšířené kategorie: pub, bar, biergarten, restaurant, cafe, nightclub, brewery. Haversine deduplikace (< 20 m = stejné místo), řazení podle priority kategorie. Exportuje `filterPubsByText(pubs, query)` a `debounce<TArgs>()` (bez `any[]`). Vrací `OsmPub[]` — typ kompatibilní s `PubFinderMap` a `page.tsx`.
- **`lib/maptiler-style.ts`** — `getMapStyle(theme, apiKey)` vrací URL MapTiler pre-built stylu. Dark: `dataviz-dark`, light: `dataviz`. Nepoužívej vlastní style JSON — bez správných glyfů a sprite URL by MapLibre hodil chyby.
- **`ManualPubAddModal.tsx`** — vlastní overlay (ne `<Modal>`), `z-[80]` — musí být nad `PubFinderModal` (`z-[70]`) a základním `<Modal>` (`z-[60]`). Používej `lib/supabase.ts` singleton, **ne** `createClientComponentClient` z `@supabase/auth-helpers-nextjs` (ten balíček není nainstalován). `useEffect` synchronizuje `prefilledName`/`prefilledAddress` s lokálním stavem při každém otevření — nutné, jinak by stare hodnoty přetrvávaly při znovuotevření.
- **Z-index hierarchie modalů**: `<Modal>` = `z-[60]`, `PubFinderModal` = `z-[70]`, `ManualPubAddModal` = `z-[80]`. Každý nový modal vrstvený nad jiný musí mít vyšší z-index — **nepoužívej** `<Modal>` jako wrapper pro modaly zobrazené nad `PubFinderModal`.
- **`PubFinderModal.tsx`** — `mapLoaded` flag (boolean) rozlišuje „mapa se ještě nenahrála" od „mapa se nahrála, ale nic nenašla". Empty state zobrazí CTA „Přidat hospodu ručně" až po prvním dokončeném fetchi.
- **`/api/overpass` route** — proxy na `https://overpass-api.de/api/interpreter`. Rate limit 1 req/2s per IP (in-memory Map s evikce nad 10 000 záznamů). Validace souřadnic (isFinite + rozsahy). `Cache-Control: public, max-age=300`. Chybové hlášky česky. `OverpassElement.tags` je volitelné (`tags?`) — API ho může vynechat.
- **`lib/overpass.ts`** — klientský wrapper, volá `/api/overpass` (ne přímo overpass-api.de). Cache klíčem je bounding box zaokrouhlený na 3 desetinná místa (≈ 111m). TTL 5 minut.

---

## Design systém — olivová paleta

### Pravidla, která NIKDY neporušuj:

1. **Žádné čisté bílé v dark mode.** Maximum: `#f0f0f0`
2. **Žádné drop-shadow na kartách.** Hierarchie přes barvu pozadí + ghost border
3. **Čísla vždy Geist Mono + `tabular-nums`**
4. **Karty `rounded-2xl`** (16px), tlačítka `rounded-xl` (12px), malá tlačítka `rounded-lg` (8px)
5. **Primary tlačítka `bg-primary text-on-primary`** — olivová #8A9900, bílý text
6. **Press state tlačítek: `active:scale-90` nebo `active:translate-y-0.5`**
7. **Ikony výhradně z lucide-react** — žádné Material Symbols

### Tailwind color tokeny (dark mode výchozí):
```
background:               #0d0d0e
surface:                  #141415
surface-container:        #1c1c1e
on-surface:               #f0f0f0
on-surface-variant:       #a0a0a4
primary:                  #8A9900   ← olivová
on-primary:               #ffffff
outline:                  #5a5a5e
outline-variant:          #232325
error:                    #e05555
error-container:          #7a1c1c
```

### Light mode (třída `.light` na `<html>`):
```
background:               #f5f5f0
surface:                  #ebebeb
on-surface:               #1a1a16
primary:                  #6b7700   ← tmavší olivová pro kontrast
```

### CSS utility třídy (globals.css):
```css
.accent-shadow { box-shadow: 0 4px 24px rgba(138, 153, 0, 0.18); }
.grain-texture { SVG noise, opacity: 0.04, pointer-events: none }
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

### Architektura (hybrid):
```
Klient → /api/scan → Google Cloud Vision (OCR) → Claude parseMenuText → JSON items
```

### API Route: `/api/scan`
```ts
// Vstup: FormData s klíčem "base64" (string, base64 JPEG)
// Výstup: JSON { items: Array<{ name: string, priceSmall: number|null, priceLarge: number|null }> }
// export const maxDuration = 60  ← nutné pro Vision + Claude kombinaci
```

### Komprimace obrázku (client side, `scan/page.tsx`):
```ts
// Max 1500px na delší straně, JPEG kvalita 0.82, Canvas API
// formData.append('base64', base64)  ← string, ne File pod klíčem 'image'!
```

### `lib/googleVision.ts`:
```ts
// POST https://vision.googleapis.com/v1/images:annotate
// Auth: X-Goog-Api-Key header (ne query param — security!)
// Feature: DOCUMENT_TEXT_DETECTION, languageHints: ['cs', 'sk']
// Vrací: fullTextAnnotation.text nebo '' pokud prázdné
```

### `lib/anthropic.ts` — `parseMenuText(ocrText)`:
```ts
// Model: claude-sonnet-4-6, max_tokens: 2048
// Vstup: surový text z OCR, výstup: ScannedItem[]
// Stripuje markdown code fences před JSON.parse (Claude občas obalí odpověď do ```json```)
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
  pub_id uuid not null references pubs(id) on delete cascade,
  name text not null,
  price_small numeric(8,2),
  price_large numeric(8,2),
  created_at timestamptz default now()
);

-- Relace uživatel × session
create table sessions (
  id uuid primary key default gen_random_uuid(),
  pub_id uuid not null references pubs(id) on delete cascade,  -- ← CASCADE (opraveno migrací 004)
  created_at timestamptz default now(),
  closed_at timestamptz
);

-- Uživatelé v session
create table session_users (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  name text not null,
  avatar_color text not null  -- ukládá se jméno uživatele, barva se derivuje za běhu
);

-- Záznamy nápojů
create table drink_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  session_user_id uuid not null references session_users(id) on delete cascade,
  drink_id uuid references drinks(id) on delete set null,  -- ← nullable + SET NULL (migrace 002)
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(8,2) not null,
  logged_at timestamptz default now()
);
```

### Migrace (v pořadí):
| Soubor | Co dělá |
|--------|---------|
| `001_initial_schema.sql` | Základní schéma + indexy |
| `002_drink_logs_nullable_drink_id.sql` | `drink_id` → nullable + ON DELETE SET NULL (bylo RESTRICT) |
| `003_disable_rls.sql` | Vypíná RLS na všech tabulkách (bez auth, DELETE bylo blokováno) |
| `004_fix_sessions_pub_id_cascade.sql` | `sessions_pub_id_fkey` → CASCADE (bylo NO ACTION, blokovalo DELETE pubs) |

### Pasti při práci s DB:
- **`IF NOT EXISTS` v migraci nepřepíše existující tabulku** — pokud tabulka vznikla přes dashboard, FK constraints mohou mít jiná pravidla než v SQL. Vždy ověř přes `information_schema.referential_constraints`.
- **RLS bez politik = tiché selhání DELETE** — Supabase má RLS enabled by default pro nové tabulky. DELETE vrátí HTTP 204 ale nesmaže nic. Používej `DISABLE ROW LEVEL SECURITY` nebo přidej policies.
- **Správný connection string pro `npx supabase db push`:** `postgresql://postgres:[heslo]@db.[ref].supabase.co:5432/postgres` (přímé připojení, NE pooler na portu 6543).

---

## Prostředí — Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
ANTHROPIC_API_KEY=...               # pouze server-side, nikdy NEXT_PUBLIC_
GOOGLE_VISION_API_KEY=...           # pouze server-side, Google Cloud Console
NEXT_PUBLIC_MAPTILER_KEY=...        # veřejný klíč pro MapTiler dlaždice (cloud.maptiler.com)
```

**Nikdy neposílej API klíče na klienta.** Vždy přes `/api/scan` route.

**Pozor při vkládání klíčů na Vercel:** klíč musí být bez trailing newline/mezery — Node.js odmítne HTTP header s neviditelným znakem a hodí `TypeError: is not a legal HTTP header value`.

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
# POZOR: přímé připojení (db subdoména + port 5432), NE pooler na 6543!
npx supabase db push --db-url "postgresql://postgres:[heslo]@db.[ref].supabase.co:5432/postgres"

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
- **Inline styly povoleny pouze pro dynamické CSS hodnoty** — konkrétně avatar barvy z `getAvatarStyle()` (`style={{ backgroundColor, color, borderColor }}`). Vše ostatní přes Tailwind třídy.
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
- ❌ Emoji v UI — pouze ikony (lucide-react)
- ❌ Material Symbols — nahrazeno lucide-react, nepoužívat
- ❌ `beer-gradient`, `brewery-shadow` — odstraněno, použij `bg-primary`, `accent-shadow`
- ❌ `getAvatarClasses()` nebo `getAvatarColor()` — odstraněno, použij `getAvatarStyle(name)`
- ❌ Anglické texty v UI — vše česky
- ❌ Rychlé přidání osob (SUGGESTED_NAMES) — odstraněno, jen tlačítko „Přidat osobu"
- ❌ `ON DELETE RESTRICT` na `drink_logs.drink_id` — používej `ON DELETE SET NULL` (jinak mazání ceníku selže pokud existují záznamy pití)
- ❌ `createClientComponentClient` z `@supabase/auth-helpers-nextjs` — balíček není nainstalován, použij singleton `import { supabase } from '@/lib/supabase'`
- ❌ `<Modal>` jako wrapper pro overlay nad `PubFinderModal` — `<Modal>` má `z-[60]`, bylo by schované. Použij vlastní `div` s vyšším z-indexem (viz z-index hierarchie výše)

---

## Co je hotové

- ✅ Root layout s ThemeProvider + PWA meta (bez Material Symbols, jen Geist fonty)
- ✅ PWA ikony (`public/icon-192.png`, `public/icon-512.png`) + `public/manifest.json`
- ✅ Onboarding stránka — search, list hospod, skeleton loader, FAB, modal pro novou hospodu + editace hospody + smazání hospody (s potvrzením, CASCADE)
- ✅ SessionContext — celý state management (useReducer), optimistické aktualizace logů, CRUD pro pub/drinks/users, `clearAllDrinks`
- ✅ ThemeContext — dark/light přepínání s localStorage persistencí
- ✅ `[pubId]/layout.tsx` — SessionProvider wrapper
- ✅ Hlavní counting stránka (`[pubId]/page.tsx`) — vertikální seznam nápojů, UserCard s rozpisem pití
- ✅ `[pubId]/account/page.tsx` — olivová total karta, per-person breakdown, uzavření session
- ✅ `[pubId]/settings/page.tsx` — editace hospody, editace/mazání nápojů, smazání celého ceníku, odkaz na sken
- ✅ `[pubId]/scan/page.tsx` — skenování ceníku (Google Vision OCR + Claude)
- ✅ `[pubId]/users/page.tsx` — přidání, editace a odebrání uživatelů, zemité avatary (bez rychlého přidání přednastavených jmen)
- ✅ API route `/api/scan` — hybrid Google Vision OCR + Claude text parsing
- ✅ `lib/googleVision.ts` — Google Cloud Vision REST wrapper
- ✅ Komponenty: BottomNav (plovoucí karta, Lucide), DrinkChips (vertikální seznam, Lucide), UserCard (inline avatar, breakdown pod tlačítky), ScanModal, ThemeToggle (Lucide Moon/Sun)
- ✅ UI primitiva: Modal (Lucide X), Toast (Lucide ikony, s useToast hookem a ToastProvider)
- ✅ Lib: supabase, googleVision, anthropic, colors (getAvatarStyle), haptics
- ✅ Typy: Pub, Drink, Session, SessionUser, DrinkLog, ScannedItem, DrinkBreakdownItem
- ✅ Supabase migrace: 001–004 (schema, nullable drink_id, disable RLS, cascade fix)
- ✅ Kompletní redesign — olivová paleta, lucide-react, zaoblené rohy (ne pills)
- ✅ Deploy na Vercel (hospoda.pro), GitHub auto-deploy z `main`
- ✅ Vyhledávání hospod v okolí — `PubFinderMap` + `PubFinderModal` + `lib/maptiler-places.ts` + `lib/overpass.ts` + `/api/overpass`
  - MapLibre GL mapa (vektorové dlaždice), geolokace (fallback Praha), olivové circle markery
  - Primárně MapTiler Places API, fallback na Overpass API pokud klíč chybí
  - Výběr hospody prefilluje formulář „Nová hospoda" v onboardingu
- ✅ Onboarding `page.tsx` — tlačítko „Najít hospody v okolí" pod search inputem
- ✅ `lib/maptiler-style.ts` — helper pro MapTiler style URL (dark/light)
- ✅ `lib/maptiler-places.ts` — 7 kategorií, Haversine dedup, priority sort, filterPubsByText, debounce
- ✅ Typy `MapBounds` a `MapPub` v `src/types/index.ts` (MapPub.tags s category/datasource)
- ✅ `ManualPubAddModal.tsx` — ruční přidání hospody přímo do Supabase, z-[80], useEffect prefill sync

## Co zbývá implementovat

- ⬜ Service worker / offline podpora
- ⬜ Supabase Auth integrace (zatím anonymní přístup)
- ⬜ Error boundaries kolem AI-dependent komponent
- ⬜ Testování na reálném iOS (haptic, safe-area, PWA install)

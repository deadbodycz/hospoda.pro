# Spec: Redesign UI + Google Vision OCR hybrid

**Datum:** 2026-04-14  
**Status:** Schváleno uživatelem

---

## Přehled

Dvě navazující změny:

1. **Google Cloud Vision API** — nahrazení přímého Anthropic vision volání hybridním přístupem: Google Vision provede OCR, Claude zpracuje extrahovaný text.
2. **Redesign UI** — kompletní vizuální přestavba aplikace dle Agrilo-inspirovaného designu s olivovou paletou.

---

## 1. Google Cloud Vision — OCR hybrid

### Motivace

Aktuální implementace posílá obrázek přímo Claude Vision modelu. Google Cloud Vision má přesnější OCR (zejména na tištěných cenících), takže hybrid je levnější a přesnější: Vision extrahuje surový text, Claude pochopí strukturu.

### Architektura

```
Klient → /api/scan → Google Cloud Vision (OCR) → Claude (parsing textu) → JSON items
```

### Změny souborů

**`lib/anthropic.ts`** — nová funkce `parseMenuText(ocrText: string)`:
- Vstup: surový text z OCR (string)
- Prompt: "Z níže uvedeného textu z ceníku extrahuj nápoje..." (stejná logika, jiný vstup)
- Výstup: `ScannedItem[]`

**`app/api/scan/route.ts`** — nový krok před voláním Claude:
1. Přijmout `FormData` s `image` (stejně jako dnes)
2. Zavolat Google Cloud Vision API (`DOCUMENT_TEXT_DETECTION`)
3. Extrahovat `fullTextAnnotation.text` z odpovědi
4. Předat text do `parseMenuText()`
5. Vrátit JSON items

**`lib/googleVision.ts`** — nový soubor:
```ts
// Wrapper pro Google Cloud Vision REST API
// Endpoint: https://vision.googleapis.com/v1/images:annotate
// Auth: API key (GOOGLE_VISION_API_KEY)
// Feature: DOCUMENT_TEXT_DETECTION
export async function extractTextFromImage(base64Image: string): Promise<string>
```

### Environment variables

Přidat do `.env.local`:
```
GOOGLE_VISION_API_KEY=...
```

### Závislosti

Žádná nová npm závislost — Google Vision API voláme přes `fetch` (REST API s API key).

### Error handling

- Google Vision selže → zachytit error, vrátit 500 se zprávou "Nepodařilo se rozpoznat text z obrázku."
- OCR vrátí prázdný text → vrátit prázdné `items: []`
- Claude parsing selže → zachytit, vrátit 500

---

## 2. Redesign UI

### Design systém — nové tokeny

| Token | Stará hodnota | Nová hodnota |
|-------|--------------|--------------|
| Background | `#131412` | `#0d0d0e` |
| Surface | `#1f201e` | `#141415` |
| Surface High | `#292a28` | `#1c1c1e` |
| Border | `#514534` | `#232325` |
| On Surface | `#e4e2de` | `#f0f0f0` |
| Text Dim | `#9e8e7a` | `#5a5a5e` |
| **Primary/Accent** | `#ffbe5b` (amber) | `#8A9900` (olivová) |
| **Accent text** | `#ffbe5b` | `#a8bc00` (světlejší pro čitelnost) |
| Error | `#ffb4ab` | `#e05555` |

### Border radius — nová pravidla

| Prvek | Stará hodnota | Nová hodnota |
|-------|--------------|--------------|
| Karty | `rounded-3xl` (24px) | `rounded-2xl` (16px) |
| Tlačítka +/− | `rounded-2xl` (16px) | `rounded-lg` (8px) |
| Chipy/řádky nápojů | `rounded-full` (pill) | `rounded-lg` (8px) |
| Avatary | `rounded-full` | `rounded-lg` (8px) |
| Bottom nav | `rounded-none` | `rounded-2xl` (20px, plovoucí) |
| Search box, pub rows | — | `rounded-xl` (12px) |
| FAB/CTA tlačítka | — | `rounded-xl` (12px) |

### Barvy avatarů — zemité tóny

Nahradit náhodné Tailwind barvy v `lib/colors.ts` deterministickým výběrem ze sady:

```ts
const AVATAR_COLORS = [
  { bg: 'rgba(138,120,80,0.15)',  color: '#C4A868', border: 'rgba(138,120,80,0.3)'  }, // ochre
  { bg: 'rgba(90,130,120,0.15)', color: '#6AADA0', border: 'rgba(90,130,120,0.3)' }, // muted teal
  { bg: 'rgba(140,100,90,0.15)', color: '#C07A6A', border: 'rgba(140,100,90,0.3)' }, // terracotta
  { bg: 'rgba(110,95,150,0.15)', color: '#9A82C8', border: 'rgba(110,95,150,0.3)' }, // dusty violet
  { bg: 'rgba(80,120,160,0.15)', color: '#6A9AB8', border: 'rgba(80,120,160,0.3)' }, // slate blue
  { bg: 'rgba(150,110,70,0.15)', color: '#C89060', border: 'rgba(150,110,70,0.3)'  }, // warm sienna
]
```

### Ikony — přechod na Lucide React

Nahradit Material Symbols za `lucide-react`:

```bash
npm install lucide-react
```

Odebrat z `app/layout.tsx` Google Fonts link na Material Symbols.

Mapování klíčových ikon:

| Aktuální (Material) | Nová (Lucide) |
|--------------------|--------------|
| `local_bar` | `Beer` |
| `wine_bar` | `Wine` |
| `water_drop` | `GlassWater` |
| `person_add` | `UserPlus` |
| `settings` | `Settings` |
| `receipt_long` | `Receipt` |
| `qr_code_scanner` | `ScanLine` |
| `add` | `Plus` |
| `remove` | `Minus` |
| `close` | `X` |
| `search` | `Search` |
| `chevron_right` | `ChevronRight` |
| `dark_mode` | `Moon` |
| `light_mode` | `Sun` |
| `delete` | `Trash2` |
| `edit` | `Pencil` |
| `lock` | `Lock` |
| `place` | `MapPin` |
| `layers` (nav počítej) | `Layers` |

### Layout změny — hlavní counting stránka (`[pubId]/page.tsx`)

**Nápoje (DrinkChips):**
- Změnit z horizontálního scroll na **vertikální seznam**
- Každý řádek: ikona Lucide + název + cena vpravo
- Aktivní: `bg-accent/12 border-accent/28 text-accent-text`
- Neaktivní: `bg-surface-high border-border text-text-dim`
- `rounded-lg` (8px)

**UserCard:**
- Horní řádek: avatar (square 32px, rounded-lg) + jméno + counter [−] N [+]
- Pod oddělovací linkou: breakdown seznam — každý typ nápoje na řádku `Nx Nápoj ... XX Kč`
- Counter tlačítka: vizuálně 26×26px, `rounded-lg`, ale s `p-3` pro touch target min 48×48px (CLAUDE.md požadavek)

**Summary bar:**
- Zůstává, ale `rounded-xl`, barva `text-accent-text`

**Bottom nav:**
- Plovoucí karta (`mx-3 mb-3`), `rounded-2xl`, `bg-surface border-border`
- Aktivní tab: `bg-accent rounded-lg` wrap ikony + `text-accent-text` label

### Layout změny — onboarding (`page.tsx`)

- Search box: `rounded-xl`, Lucide `Search` ikona
- Pub rows: `rounded-xl`, Lucide `MapPin` vlevo + `ChevronRight` vpravo
- FAB „Přidat hospodu": full-width `rounded-xl bg-accent text-white`

### Layout změny — účet (`account/page.tsx`)

- Total karta: `bg-accent rounded-2xl`, bílý text
- Per-osoba karta: horní řádek avatar + jméno + celková částka, pod oddělovačem drink breakdown (stejný pattern jako UserCard)

### globals.css — změny

Odstranit `.beer-gradient` a `.brewery-shadow`. Nahradit všechna použití `beer-gradient` v JSX třídou `bg-primary` (Tailwind token).

```css
/* Odebrat: */
/* .beer-gradient { ... } */
/* .brewery-shadow { ... } */

/* Přidat: */
.accent-shadow {
  box-shadow: 0 4px 24px rgba(138, 153, 0, 0.15);
}

body { background-color: #0d0d0e; }
```

### Light mode tokeny

```
surface:                  #F5F5F0
surface-container:        #EBEBEB
on-surface:               #1A1A16
primary:                  #6B7700   ← tmavší olivová pro kontrast na světlém
```

### tailwind.config.js — změny

Aktualizovat color tokeny:
```js
colors: {
  primary: '#8A9900',
  'primary-container': '#6d7a00',
  'on-primary': '#ffffff',
  background: '#0d0d0e',
  surface: '#141415',
  'surface-container': '#1c1c1e',
  // ...
}
```

---

## Pořadí implementace

1. **Google Vision lib + API route** (samostatné, žádná UI závislost)
2. **tailwind.config.js** — nové color tokeny
3. **globals.css** — nové utility třídy, background
4. **lib/colors.ts** — nová paleta avatarů
5. **Lucide React instalace + ikony** — náhrada Material Symbols
6. **DrinkChips** → vertikální seznam
7. **UserCard** → nový layout s breakdown
8. **BottomNav** → plovoucí, nový styl
9. **page.tsx (onboarding)** → nový styl
10. **account/page.tsx** → nový layout s breakdown
11. **settings/page.tsx + users/page.tsx + scan/page.tsx** → aktualizace tokenů a ikon

---

## Co se nemění

- Supabase schéma a typy (`types/index.ts`)
- SessionContext logika
- ThemeContext (dark/light přepínání zůstává, light tokeny se také aktualizují)
- Routing a struktura stránek
- Haptic feedback
- PWA manifest a ikony

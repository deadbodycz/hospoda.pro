# Pub Finder (Overpass + Leaflet) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "Najít v okolí" feature to the onboarding page that finds nearby pubs via OpenStreetMap/Overpass API and displays them on a Leaflet map so the user can tap-select one to prefill the "Create pub" form.

**Architecture:** A full-screen modal contains a Leaflet map loaded via `dynamic(() => import(...), { ssr: false })`. Map `moveend` events trigger a 300ms debounced call to a Next.js proxy route (`/api/overpass`) that queries Overpass API. Selecting a marker closes the finder and prefills the existing "New pub" modal. Client-side 5-minute in-memory cache sits in `lib/overpass.ts`.

**Tech Stack:** `leaflet` + `@types/leaflet`, Overpass API via `/api/overpass` proxy, Next.js 14 App Router, Tailwind CSS v3, `lucide-react`, `lib/haptics.ts`.

---

## File Map

| Status | File | Responsibility |
|--------|------|----------------|
| Modify | `src/types/index.ts` | Add `OsmPub`, `OverpassElement`, `Bounds` |
| Create | `src/lib/overpass.ts` | `searchPubsNearby(bounds)` with 5-min cache |
| Create | `src/app/api/overpass/route.ts` | Proxy to Overpass API, rate limiting, Cache-Control |
| Create | `src/components/PubFinderMap.tsx` | Leaflet map — geolocation, custom markers, moveend debounce |
| Create | `src/components/PubFinderModal.tsx` | Full-screen overlay: map + results list |
| Modify | `src/app/page.tsx` | Add "Najít v okolí" button + handler + prefill flow |

---

## Task 1: Install Leaflet + add types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Install packages**

```bash
npm install leaflet
npm install --save-dev @types/leaflet
```

Expected: both appear in `package.json`, no errors.

- [ ] **Step 2: Add types to `src/types/index.ts`**

Append after the `ScannedItem` interface (keep all existing types untouched):

```ts
/** OSM bounding box for Overpass queries */
export interface Bounds {
  north: number
  south: number
  east: number
  west: number
}

/** A pub/bar result from OpenStreetMap */
export interface OsmPub {
  id: string
  name: string
  lat: number
  lon: number
  address?: string
  phone?: string
  website?: string
  opening_hours?: string
  tags?: Record<string, string>
}

/** Raw element from Overpass API JSON response */
export interface OverpassElement {
  type: 'node' | 'way'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags: Record<string, string>
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/types/index.ts
git commit -m "feat: přidán leaflet + typy OsmPub, OverpassElement, Bounds"
git push
```

---

## Task 2: Create `/api/overpass` proxy route

**Files:**
- Create: `src/app/api/overpass/route.ts`

- [ ] **Step 1: Create `src/app/api/overpass/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import type { Bounds, OverpassElement, OsmPub } from '@/types'

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const FETCH_TIMEOUT_MS = 30_000

// Per-IP rate limit: max 1 request per 2 seconds
const lastRequestTime = new Map<string, number>()

function buildQuery(bounds: Bounds): string {
  const { south, west, north, east } = bounds
  const bbox = `${south},${west},${north},${east}`
  return (
    `[out:json][timeout:25];\n` +
    `(\n` +
    `  node["amenity"~"^(bar|pub|biergarten|night_club)$"](${bbox});\n` +
    `  way["amenity"~"^(bar|pub|biergarten|night_club)$"](${bbox});\n` +
    `);\n` +
    `out center tags;`
  )
}

function parseElement(el: OverpassElement): OsmPub | null {
  const lat = el.lat ?? el.center?.lat
  const lon = el.lon ?? el.center?.lon
  const name = el.tags?.name
  if (!lat || !lon || !name) return null

  const street = el.tags['addr:street']
  const housenumber = el.tags['addr:housenumber']
  const city = el.tags['addr:city']
  let address: string | undefined
  if (street) {
    address = housenumber ? `${street} ${housenumber}` : street
    if (city) address += `, ${city}`
  }

  return {
    id: `${el.type}/${el.id}`,
    name,
    lat,
    lon,
    address,
    phone: el.tags.phone,
    website: el.tags.website,
    opening_hours: el.tags.opening_hours,
    tags: el.tags,
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const now = Date.now()
  if ((lastRequestTime.get(ip) ?? 0) + 2_000 > now) {
    return NextResponse.json(
      { error: 'Příliš mnoho požadavků. Zkus to za chvíli.' },
      { status: 429 }
    )
  }
  lastRequestTime.set(ip, now)

  let bounds: Bounds
  try {
    const body = await req.json() as { bounds?: Bounds }
    if (
      !body.bounds ||
      typeof body.bounds.north !== 'number' ||
      typeof body.bounds.south !== 'number' ||
      typeof body.bounds.east !== 'number' ||
      typeof body.bounds.west !== 'number'
    ) {
      throw new Error('invalid bounds')
    }
    bounds = body.bounds
  } catch {
    return NextResponse.json({ error: 'Neplatný požadavek.' }, { status: 400 })
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const query = buildQuery(bounds)
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    })
    clearTimeout(timer)

    if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`)

    const json = await res.json() as { elements: OverpassElement[] }
    const pubs = json.elements
      .map(parseElement)
      .filter((p): p is OsmPub => p !== null)

    return NextResponse.json(
      { pubs },
      { headers: { 'Cache-Control': 'public, max-age=300' } }
    )
  } catch (err) {
    clearTimeout(timer)
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Požadavek vypršel. Zkus to znovu.' },
        { status: 504 }
      )
    }
    return NextResponse.json(
      { error: 'Nepodařilo se načíst hospody. Zkus to znovu.' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/overpass/route.ts
git commit -m "feat: /api/overpass proxy — Overpass query, rate limit, cache"
git push
```

---

## Task 3: Create `src/lib/overpass.ts`

**Files:**
- Create: `src/lib/overpass.ts`

- [ ] **Step 1: Create `src/lib/overpass.ts`**

```ts
import type { OsmPub, Bounds } from '@/types'

export type { Bounds }

interface CacheEntry {
  pubs: OsmPub[]
  expiresAt: number
}

// In-memory cache keyed by rounded bounding box (3 decimal places ≈ 111m precision)
const cache = new Map<string, CacheEntry>()

function boundsKey(b: Bounds): string {
  return `${b.north.toFixed(3)},${b.south.toFixed(3)},${b.east.toFixed(3)},${b.west.toFixed(3)}`
}

export async function searchPubsNearby(bounds: Bounds): Promise<OsmPub[]> {
  const key = boundsKey(bounds)
  const cached = cache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.pubs

  const res = await fetch('/api/overpass', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bounds }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? 'Nepodařilo se načíst hospody. Zkus to znovu.')
  }

  const data = await res.json() as { pubs: OsmPub[] }
  cache.set(key, { pubs: data.pubs, expiresAt: Date.now() + 5 * 60_000 })
  return data.pubs
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/overpass.ts
git commit -m "feat: lib/overpass — searchPubsNearby s 5min cache"
git push
```

---

## Task 4: Create `src/components/PubFinderMap.tsx`

**Files:**
- Create: `src/components/PubFinderMap.tsx`

This is a Leaflet map loaded entirely client-side. Key facts:
- `'use client'` directive required
- `import 'leaflet/dist/leaflet.css'` at top for tile/control styles
- Leaflet `L` object dynamically imported inside `useEffect` to avoid SSR errors
- `onSelectRef` ref keeps the `onSelect` callback current without re-running effects
- Geolocation: 5-second timeout, Praha [50.0755, 14.4378] fallback
- Custom DivIcon: olive (#8A9900) rotated diamond with 🍺 emoji
- Popup contains inline button wired directly to DOM (not React) — no `renderToString` needed
- `moveend` triggers 300ms debounce before `fetchAndRender`

- [ ] **Step 1: Create `src/components/PubFinderMap.tsx`**

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import type { OsmPub } from '@/types'
import { searchPubsNearby, type Bounds } from '@/lib/overpass'
import { haptic } from '@/lib/haptics'

interface Props {
  onSelect: (pub: OsmPub) => void
  onPubsLoaded?: (pubs: OsmPub[]) => void
}

const PRAGUE: [number, number] = [50.0755, 14.4378]
const INITIAL_ZOOM = 14

function markerHtml(): string {
  return `<div style="
    background:#8A9900;
    color:#fff;
    border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);
    width:32px;height:32px;
    border:2px solid rgba(255,255,255,0.85);
    display:flex;align-items:center;justify-content:center;
    font-size:15px;
    box-shadow:0 2px 8px rgba(0,0,0,0.45);
  "><span style="transform:rotate(45deg);line-height:1">🍺</span></div>`
}

type MapStatus = 'idle' | 'loading' | 'empty' | 'error'

export default function PubFinderMap({ onSelect, onPubsLoaded }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<import('leaflet').Map | null>(null)
  const markersRef = useRef<import('leaflet').Marker[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onSelectRef = useRef(onSelect)
  const onPubsLoadedRef = useRef(onPubsLoaded)
  const [status, setStatus] = useState<MapStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  // Always keep refs current so stale-closure in useEffect callbacks is not an issue
  onSelectRef.current = onSelect
  onPubsLoadedRef.current = onPubsLoaded

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    async function fetchAndRender(map: import('leaflet').Map) {
      const L = (await import('leaflet')).default
      const b = map.getBounds()
      const bounds: Bounds = {
        north: b.getNorth(),
        south: b.getSouth(),
        east: b.getEast(),
        west: b.getWest(),
      }

      setStatus('loading')
      try {
        const pubs = await searchPubsNearby(bounds)

        // Remove old markers
        markersRef.current.forEach((m) => m.remove())
        markersRef.current = []

        onPubsLoadedRef.current?.(pubs)

        if (pubs.length === 0) {
          setStatus('empty')
          return
        }

        pubs.forEach((pub) => {
          const icon = L.divIcon({
            html: markerHtml(),
            className: '',
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -38],
          })

          const popupEl = document.createElement('div')
          popupEl.style.cssText = 'min-width:160px;font-family:sans-serif'
          popupEl.innerHTML = `
            <strong style="display:block;margin-bottom:4px;font-size:14px;color:#1a1a1a">${pub.name}</strong>
            ${pub.address ? `<span style="display:block;font-size:12px;color:#666;margin-bottom:8px">${pub.address}</span>` : ''}
            <button style="background:#8A9900;color:#fff;border:none;padding:8px 14px;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;width:100%">
              Vybrat tuto hospodu
            </button>
          `
          popupEl.querySelector('button')?.addEventListener('click', () => {
            haptic(10)
            onSelectRef.current(pub)
          })

          const marker = L.marker([pub.lat, pub.lon], { icon })
          marker.bindPopup(L.popup({ closeButton: false }).setContent(popupEl))
          marker.addTo(map)
          markersRef.current.push(marker)
        })

        setStatus('idle')
      } catch (e) {
        setStatus('error')
        setErrorMsg(
          e instanceof Error ? e.message : 'Nepodařilo se načíst hospody. Zkus to znovu.'
        )
      }
    }

    async function init() {
      const L = (await import('leaflet')).default

      const map = L.map(containerRef.current!, { zoomControl: true })
      mapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map)

      const startAt = (lat: number, lon: number) => {
        map.setView([lat, lon], INITIAL_ZOOM)
        fetchAndRender(map)
      }

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => startAt(pos.coords.latitude, pos.coords.longitude),
          () => startAt(PRAGUE[0], PRAGUE[1]),
          { timeout: 5000 }
        )
      } else {
        startAt(PRAGUE[0], PRAGUE[1])
      }

      map.on('moveend', () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => fetchAndRender(map), 300)
      })
    }

    init()

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, []) // map init runs exactly once

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {status === 'loading' && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] bg-surface border border-outline-variant rounded-xl px-4 py-2 text-on-surface text-sm font-mono pointer-events-none">
          Načítám…
        </div>
      )}
      {status === 'error' && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] bg-error-container text-error rounded-xl px-4 py-2 text-sm max-w-[280px] text-center pointer-events-none">
          {errorMsg}
        </div>
      )}
      {status === 'empty' && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] bg-surface border border-outline-variant rounded-xl px-4 py-2 text-on-surface-variant text-sm font-mono pointer-events-none">
          V této oblasti nejsou žádné hospody.
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/PubFinderMap.tsx
git commit -m "feat: PubFinderMap — Leaflet + Overpass, geolocation, olive markery"
git push
```

---

## Task 5: Create `src/components/PubFinderModal.tsx`

**Files:**
- Create: `src/components/PubFinderModal.tsx`

This modal is intentionally **not** built on top of the existing `Modal` component because the map requires near-full-screen layout — existing `Modal` is fixed to `max-w-sm` and designed for form dialogs. This modal uses a full-screen overlay with flex column layout:
- Header (h-14, fixed): title + close button
- Map section (flex-1 min-h-0): grows to fill available space (height: 55vh min)
- Results list (max-h-[200px] scrollable): tappable pub list items
- `PubFinderMap` is loaded via `dynamic(() => import(...), { ssr: false })` to avoid Leaflet SSR errors

- [ ] **Step 1: Create `src/components/PubFinderModal.tsx`**

```tsx
'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { X, MapPin } from 'lucide-react'
import type { OsmPub } from '@/types'
import { haptic } from '@/lib/haptics'

const PubFinderMap = dynamic(() => import('./PubFinderMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-surface-container">
      <span className="text-on-surface-variant text-sm font-mono animate-pulse">
        Načítám mapu…
      </span>
    </div>
  ),
})

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (pub: OsmPub) => void
}

export function PubFinderModal({ open, onClose, onSelect }: Props) {
  const [pubs, setPubs] = useState<OsmPub[]>([])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      setPubs([])
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  function handleSelect(pub: OsmPub) {
    haptic(10)
    onSelect(pub)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-background"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 h-14 border-b-2 border-outline-variant flex-shrink-0">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          <h2 className="font-bold text-lg text-on-surface">Vyber hospodu</h2>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-container-high transition-colors active:scale-90"
          aria-label="Zavřít"
        >
          <X className="w-5 h-5 text-on-surface-variant" />
        </button>
      </div>

      {/* Map — takes 55dvh */}
      <div className="w-full flex-shrink-0" style={{ height: '55dvh' }}>
        <PubFinderMap onSelect={handleSelect} onPubsLoaded={setPubs} />
      </div>

      {/* Results list */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-2">
        {pubs.length === 0 ? (
          <p className="text-center text-on-surface-variant text-sm font-mono pt-4">
            Přesuň mapu pro zobrazení hospod v okolí.
          </p>
        ) : (
          <>
            <p className="text-on-surface-variant text-xs font-mono uppercase tracking-widest mb-3">
              {pubs.length} hospod v oblasti
            </p>
            {pubs.map((pub) => (
              <button
                key={pub.id}
                onClick={() => handleSelect(pub)}
                className="w-full flex items-center gap-3 bg-surface border border-outline-variant rounded-xl px-4 py-3 active:scale-[0.99] transition-transform text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/12 border border-primary/25 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-on-surface text-sm leading-snug">{pub.name}</p>
                  {pub.address && (
                    <p className="text-xs text-outline mt-0.5 truncate">{pub.address}</p>
                  )}
                </div>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/PubFinderModal.tsx
git commit -m "feat: PubFinderModal — full-screen overlay, mapa + seznam výsledků"
git push
```

---

## Task 6: Integrate into `src/app/page.tsx`

**Files:**
- Modify: `src/app/page.tsx`

Three changes:
1. Import `PubFinderModal` + `Navigation2` icon from lucide-react
2. Add `showPubFinderModal` state
3. Add "Najít v okolí" button between search input and pub list sections
4. Add `handlePubFinderSelect` that closes finder, prefills form fields, opens create modal
5. Render `<PubFinderModal>` near the bottom of the JSX

- [ ] **Step 1: Add import for PubFinderModal + Navigation2 icon**

In `src/app/page.tsx`, change the existing lucide import line:

```ts
// Before
import { Search, MapPin, Plus, Pencil, Trash2 } from 'lucide-react'
```

```ts
// After
import { Search, MapPin, Plus, Pencil, Trash2, Navigation2 } from 'lucide-react'
```

And add the component import after the existing component imports:

```ts
import { PubFinderModal } from '@/components/PubFinderModal'
```

- [ ] **Step 2: Add `showPubFinderModal` state**

In `OnboardingPage`, after the existing state declarations (after `const [confirmingDeletePub, ...]`), add:

```ts
// Pub finder
const [showPubFinderModal, setShowPubFinderModal] = useState(false)
```

- [ ] **Step 3: Add `handlePubFinderSelect` function**

After `createPub()` function body (before `return (`), add:

```ts
function handlePubFinderSelect(pub: import('@/types').OsmPub) {
  setShowPubFinderModal(false)
  setNewName(pub.name)
  setNewAddress(pub.address ?? '')
  setShowNewPubModal(true)
}
```

- [ ] **Step 4: Add "Najít v okolí" button in JSX**

In the JSX, find the closing `</div>` of the Search section (after the `<input>` wrapper `</div>`). Add the button immediately after that closing `</div>` and before the `{/* Pub list */}` section comment:

```tsx
{/* Pub finder button */}
<button
  onClick={() => setShowPubFinderModal(true)}
  className="w-full flex items-center gap-3 bg-surface border border-outline-variant rounded-xl px-4 py-3 active:scale-[0.99] transition-transform text-left mt-2"
>
  <div className="w-8 h-8 rounded-lg bg-primary/12 border border-primary/25 flex items-center justify-center flex-shrink-0">
    <Navigation2 className="w-4 h-4 text-primary" />
  </div>
  <div>
    <p className="font-semibold text-on-surface text-sm">Najít hospody v okolí</p>
    <p className="text-xs text-outline mt-0.5">Vyhledat na OpenStreetMap</p>
  </div>
</button>
```

- [ ] **Step 5: Render PubFinderModal**

In the JSX, after the last `</Modal>` (the "New pub modal" closing tag) and before the final `</div>` of the component return, add:

```tsx
{/* Pub finder modal */}
<PubFinderModal
  open={showPubFinderModal}
  onClose={() => setShowPubFinderModal(false)}
  onSelect={handlePubFinderSelect}
/>
```

- [ ] **Step 6: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit + push**

```bash
git add src/app/page.tsx
git commit -m "feat: tlačítko Najít v okolí + integrace PubFinderModal do onboardingu"
git push
```

---

## Manual Testing Checklist

After all tasks complete, verify in a browser (mobile viewport, 375px width):

- [ ] "Najít v okolí" button visible below search input, min 48px height
- [ ] Tap opens full-screen modal with header and loading state
- [ ] Geolocation permission dialog appears (or Praha loads if denied)
- [ ] Olive 🍺 markers appear on the map
- [ ] Tapping marker opens popup with "Vybrat tuto hospodu" button
- [ ] Tapping button closes finder, prefills name+address in "New pub" modal
- [ ] "Create pub" modal confirms and navigates to pub page
- [ ] Scrollable pub list under map shows correct count
- [ ] Tapping list item also prefills and opens "New pub" modal
- [ ] Dragging map loads new markers (debounced, not spamming)
- [ ] Dark mode toggle works inside the finder modal
- [ ] Close button (X) + backdrop tap closes modal
- [ ] Error state shown if Overpass unreachable (disconnect wifi, reload)
- [ ] Empty state shown when zoomed in on an area with no pubs

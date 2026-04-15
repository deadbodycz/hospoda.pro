import type { OsmPub, Bounds } from '@/types'
import { searchPubsNearby as searchOverpass } from '@/lib/overpass'

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY

// Kategorie hospod (pro dokumentaci a případné budoucí POI API)
export const PUB_CATEGORIES = [
  'catering.pub',
  'catering.bar',
  'catering.biergarten',
  'catering.restaurant',
  'catering.cafe',
  'catering.nightclub',
  'craft.brewery',
]

// Prioritizace kategorií pro řazení výsledků (nižší = vyšší priorita)
const CATEGORY_PRIORITY: Record<string, number> = {
  'catering.pub': 1,
  pub: 1,
  'catering.biergarten': 2,
  biergarten: 2,
  'catering.bar': 3,
  bar: 3,
  'craft.brewery': 4,
  brewery: 4,
  'catering.nightclub': 5,
  night_club: 5,
  'catering.restaurant': 6,
  restaurant: 6,
  'catering.cafe': 7,
  cafe: 7,
  fast_food: 8,
  'catering.fast_food': 8,
}

/** Vzdálenost mezi dvěma body v metrech (Haversine) */
function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Priorita kategorie — nižší číslo = vyšší priorita */
function categoryPriority(category: string | undefined): number {
  if (!category) return 99
  // Přímá shoda nebo shoda jako substring
  const directKey = Object.keys(CATEGORY_PRIORITY).find(
    (k) => category === k || category.includes(k)
  )
  return directKey ? CATEGORY_PRIORITY[directKey] : 99
}

/** Deduplikace + sorting: sloučí místa blíže než 20 m, seřadí podle priority kategorie */
export function deduplicateAndSort(pubs: OsmPub[]): OsmPub[] {
  const unique: OsmPub[] = []
  const MIN_DIST = 20 // metrů

  for (const pub of pubs) {
    const nearIdx = unique.findIndex(
      (u) => distanceMeters(pub.lat, pub.lon, u.lat, u.lon) < MIN_DIST
    )
    if (nearIdx === -1) {
      unique.push(pub)
    } else {
      // Zachovej hospodu s lepší (nižší) prioritou kategorie
      const pubPrio = categoryPriority(pub.tags?.category ?? pub.tags?.amenity)
      const existPrio = categoryPriority(
        unique[nearIdx].tags?.category ?? unique[nearIdx].tags?.amenity
      )
      if (pubPrio < existPrio) unique[nearIdx] = pub
    }
  }

  return unique.sort((a, b) => {
    const aPrio = categoryPriority(a.tags?.category ?? a.tags?.amenity)
    const bPrio = categoryPriority(b.tags?.category ?? b.tags?.amenity)
    return aPrio !== bPrio ? aPrio - bPrio : a.name.length - b.name.length
  })
}

/**
 * Vyhledá hospody v daném bounding boxu.
 * Používá Overpass API (přes /api/overpass proxy) s aplikovanou deduplikací a sortingem.
 * Pokud je nastaven NEXT_PUBLIC_MAPTILER_KEY, pokusí se nejprve o MapTiler Geocoding API
 * (text search "hospoda" s bbox filtrací) a při selhání nebo prázdném výsledku fallbackne na Overpass.
 */
export async function searchPubsNearby(bounds: Bounds): Promise<OsmPub[]> {
  if (MAPTILER_KEY) {
    try {
      const pubs = await searchViaMaptiler(bounds)
      if (pubs.length > 0) return deduplicateAndSort(pubs)
    } catch {
      // Pokračuj na Overpass fallback
    }
  }

  // Overpass: spolehlivý fallback i primární zdroj bez MapTiler klíče
  const pubs = await searchOverpass(bounds)
  return deduplicateAndSort(pubs)
}

interface MaptilerFeature {
  id: string
  type: 'Feature'
  geometry: { type: 'Point'; coordinates: [number, number] }
  properties: {
    name?: string
    street?: string
    housenumber?: string
    city?: string
    phone?: string
    website?: string
    opening_hours?: string
    category?: string
    categories?: string[]
    datasource?: { source: string; recordid?: string }
    [key: string]: unknown
  }
}

/** Pokusí se vyhledat hospody přes MapTiler Geocoding API (text search s bbox) */
async function searchViaMaptiler(bounds: Bounds): Promise<OsmPub[]> {
  const bbox = `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`
  // MapTiler Geocoding: hledá text "pub" omezený na bbox
  // Docs: https://docs.maptiler.com/cloud/api/geocoding/
  const url = `https://api.maptiler.com/geocoding/pub.json?bbox=${bbox}&limit=50&language=cs,en&key=${MAPTILER_KEY}`

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`MapTiler ${res.status}`)

  const data = await res.json() as { features?: MaptilerFeature[] }
  if (!data.features?.length) throw new Error('empty')

  return data.features
    .filter((f) => f.properties.name && f.properties.name.length >= 2)
    .map((f): OsmPub => ({
      id: generateId(f),
      name: f.properties.name!.trim(),
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0],
      address: formatAddress(f.properties),
      phone: f.properties.phone,
      website: f.properties.website,
      opening_hours: f.properties.opening_hours,
      tags: {
        category: f.properties.category ?? f.properties.categories?.[0] ?? 'catering.pub',
        datasource: f.properties.datasource?.source ?? 'maptiler',
      },
    }))
}

function generateId(f: MaptilerFeature): string {
  const ds = f.properties.datasource
  if (ds?.recordid) return `${ds.source}:${ds.recordid}`
  const [lng, lat] = f.geometry.coordinates
  return `coord:${lat.toFixed(6)}:${lng.toFixed(6)}`
}

function formatAddress(props: MaptilerFeature['properties']): string | undefined {
  const parts: string[] = []
  if (props.street) {
    parts.push(props.housenumber ? `${props.street} ${props.housenumber}` : props.street)
  }
  if (props.city) parts.push(props.city)
  return parts.length > 0 ? parts.join(', ') : undefined
}

/**
 * Filtruje nalezené hospody podle fulltextového dotazu (client-side).
 */
export function filterPubsByText(pubs: OsmPub[], query: string): OsmPub[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return pubs
  return pubs.filter((pub) => {
    const haystack = [pub.name, pub.address, pub.tags?.category, pub.tags?.amenity]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  })
}

/**
 * Debounce helper pro search callbacky.
 */
export function debounce<TArgs extends unknown[]>(
  func: (...args: TArgs) => void,
  wait: number
): (...args: TArgs) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null
  return (...args: TArgs) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

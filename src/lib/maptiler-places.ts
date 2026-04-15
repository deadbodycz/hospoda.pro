import type { OsmPub, Bounds } from '@/types'
import { searchPubsNearby as searchOverpass } from '@/lib/overpass'

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY

// Rozšířené kategorie pro lepší coverage hospod v okolí
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
  'catering.biergarten': 2,
  'catering.bar': 3,
  'craft.brewery': 4,
  'catering.nightclub': 5,
  'catering.restaurant': 6,
  'catering.cafe': 7,
}

interface MaptilerFeature {
  id: string
  type: 'Feature'
  geometry: {
    type: 'Point'
    coordinates: [number, number] // [lng, lat]
  }
  properties: {
    name?: string
    street?: string
    housenumber?: string
    postcode?: string
    city?: string
    phone?: string
    website?: string
    opening_hours?: string
    categories?: string[]
    category?: string
    datasource?: {
      source: string
      recordid?: string
    }
    [key: string]: unknown
  }
}

interface MaptilerResponse {
  type: 'FeatureCollection'
  features: MaptilerFeature[]
}

function formatAddress(props: MaptilerFeature['properties']): string | undefined {
  const parts: string[] = []
  if (props.street) {
    parts.push(props.housenumber ? `${props.street} ${props.housenumber}` : props.street)
  }
  if (props.city) parts.push(props.city)
  return parts.length > 0 ? parts.join(', ') : undefined
}

/** Vygeneruje ID z datasource nebo ze souřadnic jako fallback */
function generateId(feature: MaptilerFeature): string {
  const ds = feature.properties.datasource
  if (ds?.recordid) return `${ds.source}:${ds.recordid}`
  const [lng, lat] = feature.geometry.coordinates
  return `coord:${lat.toFixed(6)}:${lng.toFixed(6)}`
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

/** Priorita kategorie z tagu hospody */
function categoryPriority(category: string | undefined): number {
  if (!category) return 99
  const key = Object.keys(CATEGORY_PRIORITY).find((k) => category.includes(k))
  return key ? CATEGORY_PRIORITY[key] : 99
}

/** Deduplikace + sorting: odstraní duplicity do 20 m, seřadí podle priority kategorie */
function deduplicateAndSort(pubs: OsmPub[]): OsmPub[] {
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
      const pubPrio = categoryPriority(pub.tags?.category)
      const existPrio = categoryPriority(unique[nearIdx].tags?.category)
      if (pubPrio < existPrio) unique[nearIdx] = pub
    }
  }

  return unique.sort((a, b) => {
    const diff = categoryPriority(a.tags?.category) - categoryPriority(b.tags?.category)
    return diff !== 0 ? diff : a.name.length - b.name.length
  })
}

/**
 * Vyhledá hospody v daném bounding boxu.
 * Primárně přes MapTiler Places API, fallback na Overpass pokud klíč chybí nebo API selže.
 */
export async function searchPubsNearby(bounds: Bounds): Promise<OsmPub[]> {
  if (!MAPTILER_KEY) {
    return searchOverpass(bounds)
  }

  const bbox = `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`
  const categories = PUB_CATEGORIES.join(',')
  const url = `https://api.maptiler.com/geocoding/pubs.json?categories=${categories}&bbox=${bbox}&limit=100&key=${MAPTILER_KEY}`

  try {
    const res = await fetch(url)
    if (!res.ok) return searchOverpass(bounds)

    const data = (await res.json()) as MaptilerResponse
    if (!data.features?.length) return searchOverpass(bounds)

    const pubs: OsmPub[] = data.features
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
          category: f.properties.category ?? (f.properties.categories?.[0] ?? ''),
          datasource: f.properties.datasource?.source ?? '',
        },
      }))

    return deduplicateAndSort(pubs)
  } catch {
    return searchOverpass(bounds)
  }
}

/**
 * Filtruje nalezené hospody podle fulltextového dotazu (client-side).
 */
export function filterPubsByText(pubs: OsmPub[], query: string): OsmPub[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return pubs
  return pubs.filter((pub) => {
    const haystack = [pub.name, pub.address, pub.tags?.category]
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

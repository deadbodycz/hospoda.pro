import type { OsmPub, Bounds } from '@/types'
import { searchPubsNearby as searchOverpass } from '@/lib/overpass'

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY

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

/**
 * Search for pubs/bars near the given bounding box.
 * Uses MapTiler Places API if NEXT_PUBLIC_MAPTILER_KEY is configured,
 * otherwise falls back to Overpass API.
 */
export async function searchPubsNearby(bounds: Bounds): Promise<OsmPub[]> {
  if (!MAPTILER_KEY) {
    // Fallback to Overpass API when no MapTiler key is configured
    return searchOverpass(bounds)
  }

  const bbox = `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`
  const categories = ['catering.pub', 'catering.bar', 'catering.biergarten'].join(',')
  const url = `https://api.maptiler.com/geocoding/pubs.json?categories=${categories}&bbox=${bbox}&limit=50&key=${MAPTILER_KEY}`

  const res = await fetch(url)
  if (!res.ok) {
    // Fallback to Overpass on API error
    return searchOverpass(bounds)
  }

  const data = (await res.json()) as MaptilerResponse

  if (!data.features || data.features.length === 0) {
    // Also try Overpass for richer data in areas MapTiler might lack
    return searchOverpass(bounds)
  }

  return data.features
    .filter((f) => f.properties.name)
    .map((f): OsmPub => ({
      id: f.id,
      name: f.properties.name!,
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0],
      address: formatAddress(f.properties),
      phone: f.properties.phone,
      website: f.properties.website,
      opening_hours: f.properties.opening_hours,
    }))
}

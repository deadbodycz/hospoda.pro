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

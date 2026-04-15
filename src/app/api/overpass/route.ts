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
  if (lat == null || lon == null || !name) return null

  const street = el.tags?.['addr:street']
  const housenumber = el.tags?.['addr:housenumber']
  const city = el.tags?.['addr:city']
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
    phone: el.tags?.phone,
    website: el.tags?.website,
    opening_hours: el.tags?.opening_hours,
    tags: el.tags,
  }
}

export async function POST(req: NextRequest) {
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'
  const now = Date.now()
  if ((lastRequestTime.get(ip) ?? 0) + 2_000 > now) {
    return NextResponse.json(
      { error: 'Příliš mnoho požadavků. Zkus to za chvíli.' },
      { status: 429 }
    )
  }
  lastRequestTime.set(ip, now)
  if (lastRequestTime.size > 10_000) {
    Array.from(lastRequestTime.entries()).forEach(([key, ts]) => {
      if (ts + 2_000 < now) lastRequestTime.delete(key)
    })
  }

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
    const { north, south, east, west } = body.bounds
    if (
      !isFinite(north) || !isFinite(south) || !isFinite(east) || !isFinite(west) ||
      north < -90 || north > 90 || south < -90 || south > 90 ||
      east < -180 || east > 180 || west < -180 || west > 180 ||
      south >= north
    ) {
      throw new Error('out of range bounds')
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

    if (res.status === 429) {
      return NextResponse.json(
        { error: 'Příliš mnoho požadavků na Overpass. Zkus to za chvíli.' },
        { status: 503 }
      )
    }

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

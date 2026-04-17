export interface Pub {
  id: string
  name: string
  address: string | null
  menu_photo_url: string | null
  created_at: string
}

export interface Drink {
  id: string
  pub_id: string
  name: string
  price_small: number | null
  price_large: number | null
  created_at: string
}

export interface Session {
  id: string
  pub_id: string
  created_at: string
  closed_at: string | null
}

export interface SessionUser {
  id: string
  session_id: string
  name: string
  avatar_color: string // e.g. 'amber', 'rose', 'sky'…
}

export interface DrinkLog {
  id: string
  session_id: string
  session_user_id: string
  drink_id: string | null
  quantity: number
  unit_price: number
  logged_at: string
}

/** Item parsed from the AI menu scan */
export interface ScannedItem {
  name: string
  priceSmall: number | null
  priceLarge: number | null
}

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
  tags?: Record<string, string>
}

/** Bounding box for map queries (used with MapLibre / MapTiler) */
export interface MapBounds {
  north: number
  south: number
  east: number
  west: number
}

/** A pub/bar result with MapLibre-compatible coordinates */
export interface MapPub {
  id: string
  name: string
  coordinates: [number, number] // [lng, lat] — MapLibre convention
  address?: string
  phone?: string
  website?: string
  opening_hours?: string
  tags?: {
    category?: string
    datasource?: string
    [key: string]: string | undefined
  }
}

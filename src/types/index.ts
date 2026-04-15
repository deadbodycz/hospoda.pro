export interface Pub {
  id: string
  name: string
  address: string | null
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

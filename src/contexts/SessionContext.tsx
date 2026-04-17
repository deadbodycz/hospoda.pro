'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
} from 'react'
import { supabase } from '@/lib/supabase'
import type { Drink, DrinkLog, Pub, Session, SessionUser } from '@/types'
import { useSubscription } from '@/contexts/SubscriptionContext'

// ── localStorage helpers ───────────────────────────────────────

const LS = {
  get<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback
    try {
      const raw = localStorage.getItem(key)
      return raw !== null ? (JSON.parse(raw) as T) : fallback
    } catch {
      return fallback
    }
  },
  set(key: string, value: unknown) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value))
    }
  },
  remove(key: string) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key)
    }
  },
}

const LS_KEYS = {
  pub: 'hospoda_pub',
  drinks: 'hospoda_drinks',
  session: 'hospoda_session',
  users: 'hospoda_users',
  logs: 'hospoda_logs',
}

// ── State ─────────────────────────────────────────────────────

interface State {
  pub: Pub | null
  session: Session | null
  drinks: Drink[]
  users: SessionUser[]
  logs: DrinkLog[]
  loading: boolean
  error: string | null
}

type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'INIT'; payload: Omit<State, 'loading' | 'error'> }
  | { type: 'ADD_USER'; payload: SessionUser }
  | { type: 'REMOVE_USER'; payload: string }
  | { type: 'UPDATE_USER'; payload: { id: string; name: string } }
  | { type: 'ADD_DRINKS'; payload: Drink[] }
  | { type: 'UPDATE_DRINK'; payload: Drink }
  | { type: 'REMOVE_DRINK'; payload: string }
  | { type: 'UPDATE_PUB'; payload: Partial<Pick<Pub, 'name' | 'address' | 'menu_photo_url'>> }
  | { type: 'ADD_LOG'; payload: DrinkLog }
  | { type: 'REMOVE_LOG'; payload: string }
  | { type: 'CLOSE_SESSION'; payload: string }
  | { type: 'CLEAR_DRINKS' }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false }
    case 'INIT':
      return { ...action.payload, loading: false, error: null }
    case 'ADD_USER':
      return { ...state, users: [...state.users, action.payload] }
    case 'REMOVE_USER':
      return { ...state, users: state.users.filter((u) => u.id !== action.payload) }
    case 'UPDATE_USER':
      return {
        ...state,
        users: state.users.map((u) =>
          u.id === action.payload.id ? { ...u, name: action.payload.name } : u
        ),
      }
    case 'ADD_DRINKS':
      return { ...state, drinks: [...state.drinks, ...action.payload] }
    case 'UPDATE_DRINK':
      return {
        ...state,
        drinks: state.drinks.map((d) =>
          d.id === action.payload.id ? action.payload : d
        ),
      }
    case 'REMOVE_DRINK':
      return { ...state, drinks: state.drinks.filter((d) => d.id !== action.payload) }
    case 'UPDATE_PUB':
      if (!state.pub) return state
      return { ...state, pub: { ...state.pub, ...action.payload } }
    case 'ADD_LOG':
      return { ...state, logs: [...state.logs, action.payload] }
    case 'REMOVE_LOG':
      return { ...state, logs: state.logs.filter((l) => l.id !== action.payload) }
    case 'CLOSE_SESSION':
      if (!state.session) return state
      return { ...state, session: { ...state.session, closed_at: action.payload } }
    case 'CLEAR_DRINKS':
      return { ...state, drinks: [] }
    default:
      return state
  }
}

const initialState: State = {
  pub: null,
  session: null,
  drinks: [],
  users: [],
  logs: [],
  loading: true,
  error: null,
}

// ── Context value ──────────────────────────────────────────────

export interface DrinkBreakdownItem {
  drink: Drink
  count: number
  subtotal: number
}

interface SessionContextValue extends State {
  addUser: (name: string) => Promise<void>
  removeUser: (id: string) => Promise<void>
  updateUser: (id: string, name: string) => Promise<void>
  addDrinks: (
    items: { name: string; priceSmall: number | null; priceLarge: number | null }[]
  ) => Promise<void>
  updateDrink: (id: string, name: string, priceSmall: number | null, priceLarge: number | null) => Promise<void>
  removeDrink: (id: string) => Promise<void>
  clearAllDrinks: () => Promise<void>
  updatePub: (name: string, address: string | null) => Promise<void>
  updateMenuPhoto: (url: string | null) => Promise<void>
  incrementDrink: (userId: string, drink: Drink) => Promise<void>
  decrementDrink: (userId: string, drinkId: string) => Promise<void>
  closeSession: () => Promise<void>
  /** Count of a specific drink for a specific user */
  drinkCount: (userId: string, drinkId: string) => number
  /** Total spent by a specific user */
  userTotal: (userId: string) => number
  /** Drink breakdown for a specific user */
  userDrinkBreakdown: (userId: string) => DrinkBreakdownItem[]
  /** Grand total for the whole session */
  sessionTotal: number
  /** Total number of drinks in the session */
  sessionDrinkCount: number
  /** The last drink a user ordered */
  lastDrink: (userId: string) => Drink | undefined
}

const SessionContext = createContext<SessionContextValue>({
  ...initialState,
  addUser: async () => {},
  removeUser: async () => {},
  updateUser: async () => {},
  addDrinks: async () => {},
  updateDrink: async () => {},
  removeDrink: async () => {},
  clearAllDrinks: async () => {},
  updatePub: async () => {},
  updateMenuPhoto: async () => {},
  incrementDrink: async () => {},
  decrementDrink: async () => {},
  closeSession: async () => {},
  drinkCount: () => 0,
  userTotal: () => 0,
  userDrinkBreakdown: () => [],
  sessionTotal: 0,
  sessionDrinkCount: 0,
  lastDrink: () => undefined,
})

// ── Provider ───────────────────────────────────────────────────

export function SessionProvider({
  pubId,
  children,
}: {
  pubId: string
  children: React.ReactNode
}) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const { isPro } = useSubscription()

  // Load everything on mount
  useEffect(() => {
    let cancelled = false

    async function load() {
      dispatch({ type: 'SET_LOADING', payload: true })

      if (!isPro) {
        const pub = LS.get<Pub | null>(LS_KEYS.pub, null)
        const drinks = LS.get<Drink[]>(LS_KEYS.drinks, [])
        const users = LS.get<SessionUser[]>(LS_KEYS.users, [])
        const logs = LS.get<DrinkLog[]>(LS_KEYS.logs, [])
        let session = LS.get<Session | null>(LS_KEYS.session, null)

        if (!pub || pub.id !== pubId) {
          if (!cancelled) dispatch({ type: 'SET_ERROR', payload: 'Hospoda nenalezena.' })
          return
        }

        if (!session) {
          session = {
            id: crypto.randomUUID(),
            pub_id: pubId,
            created_at: new Date().toISOString(),
            closed_at: null,
          }
          LS.set(LS_KEYS.session, session)
        }

        if (!cancelled) {
          dispatch({ type: 'INIT', payload: { pub, session, drinks, users, logs } })
        }
        return
      }

      // Pro mode — Supabase
      const { data: pub, error: pubErr } = await supabase
        .from('pubs').select('*').eq('id', pubId).single()

      if (pubErr || !pub) {
        if (!cancelled) dispatch({ type: 'SET_ERROR', payload: 'Hospodu se nepodařilo načíst.' })
        return
      }

      let session: Session | null = null
      const { data: existingSession } = await supabase
        .from('sessions').select('*').eq('pub_id', pubId)
        .is('closed_at', null).order('created_at', { ascending: false })
        .limit(1).maybeSingle()

      if (existingSession) {
        session = existingSession
      } else {
        const { data: newSession, error: sessionErr } = await supabase
          .from('sessions').insert({ pub_id: pubId }).select().single()
        if (sessionErr || !newSession) {
          if (!cancelled) dispatch({ type: 'SET_ERROR', payload: 'Nepodařilo se vytvořit session.' })
          return
        }
        session = newSession
      }

      if (!session) {
        if (!cancelled) dispatch({ type: 'SET_ERROR', payload: 'Session nebyla nalezena.' })
        return
      }

      const { data: drinks } = await supabase
        .from('drinks').select('*').eq('pub_id', pubId).order('created_at')
      const { data: users } = await supabase
        .from('session_users').select('*').eq('session_id', session.id).order('created_at')
      const { data: logs } = await supabase
        .from('drink_logs').select('*').eq('session_id', session.id).order('logged_at')

      if (!cancelled) {
        dispatch({
          type: 'INIT',
          payload: { pub, session, drinks: drinks ?? [], users: users ?? [], logs: logs ?? [] },
        })
      }
    }

    load()
    return () => { cancelled = true }
  }, [pubId, isPro])

  // ── Actions ────────────────────────────────────────────────

  const addUser = useCallback(
    async (name: string) => {
      if (!state.session) return
      if (!isPro) {
        const user: SessionUser = {
          id: crypto.randomUUID(),
          session_id: state.session.id,
          name,
          avatar_color: name,
        }
        const existing = LS.get<SessionUser[]>(LS_KEYS.users, [])
        LS.set(LS_KEYS.users, [...existing, user])
        dispatch({ type: 'ADD_USER', payload: user })
        return
      }
      const { data, error } = await supabase
        .from('session_users')
        .insert({ session_id: state.session.id, name, avatar_color: name })
        .select().single()
      if (!error && data) dispatch({ type: 'ADD_USER', payload: data })
    },
    [state.session, isPro]
  )

  const removeUser = useCallback(
    async (id: string) => {
      if (!isPro) {
        const existing = LS.get<SessionUser[]>(LS_KEYS.users, [])
        LS.set(LS_KEYS.users, existing.filter((u) => u.id !== id))
      } else {
        await supabase.from('session_users').delete().eq('id', id)
      }
      dispatch({ type: 'REMOVE_USER', payload: id })
    },
    [isPro]
  )

  const updateUser = useCallback(
    async (id: string, name: string) => {
      if (!isPro) {
        const existing = LS.get<SessionUser[]>(LS_KEYS.users, [])
        LS.set(LS_KEYS.users, existing.map((u) => u.id === id ? { ...u, name } : u))
      } else {
        await supabase.from('session_users').update({ name }).eq('id', id)
      }
      dispatch({ type: 'UPDATE_USER', payload: { id, name } })
    },
    [isPro]
  )

  const addDrinks = useCallback(
    async (items: { name: string; priceSmall: number | null; priceLarge: number | null }[]) => {
      if (!state.pub) return
      if (!isPro) {
        const newDrinks: Drink[] = items.map((item) => ({
          id: crypto.randomUUID(),
          pub_id: state.pub!.id,
          name: item.name,
          price_small: item.priceSmall,
          price_large: item.priceLarge,
          created_at: new Date().toISOString(),
        }))
        const existing = LS.get<Drink[]>(LS_KEYS.drinks, [])
        LS.set(LS_KEYS.drinks, [...existing, ...newDrinks])
        dispatch({ type: 'ADD_DRINKS', payload: newDrinks })
        return
      }
      const rows = items.map((item) => ({
        pub_id: state.pub!.id,
        name: item.name,
        price_small: item.priceSmall,
        price_large: item.priceLarge,
      }))
      const { data, error } = await supabase.from('drinks').insert(rows).select()
      if (!error && data) dispatch({ type: 'ADD_DRINKS', payload: data })
    },
    [state.pub, isPro]
  )

  const updateDrink = useCallback(
    async (id: string, name: string, priceSmall: number | null, priceLarge: number | null) => {
      if (!isPro) {
        const existing = LS.get<Drink[]>(LS_KEYS.drinks, [])
        const next = existing.map((d) =>
          d.id === id ? { ...d, name, price_small: priceSmall, price_large: priceLarge } : d
        )
        LS.set(LS_KEYS.drinks, next)
        const updated = next.find((d) => d.id === id)!
        dispatch({ type: 'UPDATE_DRINK', payload: updated })
        return
      }
      const { data, error } = await supabase
        .from('drinks')
        .update({ name, price_small: priceSmall, price_large: priceLarge })
        .eq('id', id).select().single()
      if (!error && data) dispatch({ type: 'UPDATE_DRINK', payload: data })
    },
    [isPro]
  )

  const removeDrink = useCallback(
    async (id: string) => {
      if (!isPro) {
        const existing = LS.get<Drink[]>(LS_KEYS.drinks, [])
        LS.set(LS_KEYS.drinks, existing.filter((d) => d.id !== id))
      } else {
        await supabase.from('drinks').delete().eq('id', id)
      }
      dispatch({ type: 'REMOVE_DRINK', payload: id })
    },
    [isPro]
  )

  const clearAllDrinks = useCallback(
    async () => {
      if (!state.pub) return
      if (!isPro) {
        LS.set(LS_KEYS.drinks, [])
        const pub = LS.get<Pub | null>(LS_KEYS.pub, null)
        if (pub) LS.set(LS_KEYS.pub, { ...pub, menu_photo_url: null })
      } else {
        await supabase.from('drinks').delete().eq('pub_id', state.pub.id)
        await supabase.storage.from('menu-photos').remove([`${state.pub.id}.jpg`])
        await supabase.from('pubs').update({ menu_photo_url: null }).eq('id', state.pub.id)
      }
      dispatch({ type: 'CLEAR_DRINKS' })
      dispatch({ type: 'UPDATE_PUB', payload: { menu_photo_url: null } })
    },
    [state.pub, isPro]
  )

  const updatePub = useCallback(
    async (name: string, address: string | null) => {
      if (!state.pub) return
      if (!isPro) {
        const pub = { ...state.pub, name, address }
        LS.set(LS_KEYS.pub, pub)
      } else {
        await supabase.from('pubs').update({ name, address }).eq('id', state.pub.id)
      }
      dispatch({ type: 'UPDATE_PUB', payload: { name, address } })
    },
    [state.pub, isPro]
  )

  const updateMenuPhoto = useCallback(
    async (url: string | null) => {
      if (!state.pub) return
      if (!isPro) {
        const pub = { ...state.pub, menu_photo_url: url }
        LS.set(LS_KEYS.pub, pub)
        dispatch({ type: 'UPDATE_PUB', payload: { menu_photo_url: url } })
        return
      }
      const { error } = await supabase
        .from('pubs').update({ menu_photo_url: url }).eq('id', state.pub.id)
      if (!error) dispatch({ type: 'UPDATE_PUB', payload: { menu_photo_url: url } })
    },
    [state.pub, isPro]
  )

  const incrementDrink = useCallback(
    async (userId: string, drink: Drink) => {
      if (!state.session) return
      const unitPrice = drink.price_large ?? drink.price_small ?? 0

      if (!isPro) {
        const log: DrinkLog = {
          id: crypto.randomUUID(),
          session_id: state.session.id,
          session_user_id: userId,
          drink_id: drink.id,
          quantity: 1,
          unit_price: unitPrice,
          logged_at: new Date().toISOString(),
        }
        const existing = LS.get<DrinkLog[]>(LS_KEYS.logs, [])
        LS.set(LS_KEYS.logs, [...existing, log])
        dispatch({ type: 'ADD_LOG', payload: log })
        return
      }

      const tempId = `tmp-${Date.now()}-${Math.random()}`
      const optimistic: DrinkLog = {
        id: tempId,
        session_id: state.session.id,
        session_user_id: userId,
        drink_id: drink.id,
        quantity: 1,
        unit_price: unitPrice,
        logged_at: new Date().toISOString(),
      }
      dispatch({ type: 'ADD_LOG', payload: optimistic })

      const { data, error } = await supabase
        .from('drink_logs')
        .insert({ session_id: state.session.id, session_user_id: userId, drink_id: drink.id, quantity: 1, unit_price: unitPrice })
        .select().single()

      if (error) {
        dispatch({ type: 'REMOVE_LOG', payload: tempId })
      } else if (data) {
        dispatch({ type: 'REMOVE_LOG', payload: tempId })
        dispatch({ type: 'ADD_LOG', payload: data })
      }
    },
    [state.session, isPro]
  )

  const decrementDrink = useCallback(
    async (userId: string, drinkId: string) => {
      if (!isPro) {
        const allLogs = LS.get<DrinkLog[]>(LS_KEYS.logs, [])
        const lastLog = [...allLogs]
          .filter((l) => l.session_user_id === userId && l.drink_id === drinkId)
          .sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime())[0]
        if (!lastLog) return
        LS.set(LS_KEYS.logs, allLogs.filter((l) => l.id !== lastLog.id))
        dispatch({ type: 'REMOVE_LOG', payload: lastLog.id })
        return
      }

      const lastLog = [...state.logs]
        .filter((l) => l.session_user_id === userId && l.drink_id === drinkId)
        .sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime())[0]
      if (!lastLog) return
      await supabase.from('drink_logs').delete().eq('id', lastLog.id)
      dispatch({ type: 'REMOVE_LOG', payload: lastLog.id })
    },
    [state.logs, isPro]
  )

  const closeSession = useCallback(
    async () => {
      if (!state.session) return
      const closedAt = new Date().toISOString()

      if (!isPro) {
        const session = { ...state.session, closed_at: closedAt }
        LS.set(LS_KEYS.session, session)
        // Vymaž menu_photo_url z LS pub
        if (state.pub) {
          const lsPub = LS.get<typeof state.pub | null>(LS_KEYS.pub, null)
          if (lsPub) LS.set(LS_KEYS.pub, { ...lsPub, menu_photo_url: null })
        }
        dispatch({ type: 'CLOSE_SESSION', payload: closedAt })
        dispatch({ type: 'UPDATE_PUB', payload: { menu_photo_url: null } })
        return
      }

      await supabase.from('sessions').update({ closed_at: closedAt }).eq('id', state.session.id)
      if (state.pub) {
        await supabase.storage.from('menu-photos').remove([`${state.pub.id}.jpg`])
        await supabase.from('pubs').update({ menu_photo_url: null }).eq('id', state.pub.id)
        dispatch({ type: 'UPDATE_PUB', payload: { menu_photo_url: null } })
      }
      dispatch({ type: 'CLOSE_SESSION', payload: closedAt })
    },
    [state.session, state.pub, isPro]
  )

  // ── Derived ────────────────────────────────────────────────

  const drinkCount = useCallback(
    (userId: string, drinkId: string) =>
      state.logs
        .filter((l) => l.session_user_id === userId && l.drink_id === drinkId)
        .reduce((sum, l) => sum + l.quantity, 0),
    [state.logs]
  )

  const userTotal = useCallback(
    (userId: string) =>
      state.logs
        .filter((l) => l.session_user_id === userId)
        .reduce((sum, l) => sum + l.unit_price * l.quantity, 0),
    [state.logs]
  )

  const sessionTotal = state.logs.reduce(
    (sum, l) => sum + l.unit_price * l.quantity,
    0
  )

  const sessionDrinkCount = state.logs.reduce((sum, l) => sum + l.quantity, 0)

  const userDrinkBreakdown = useCallback(
    (userId: string): DrinkBreakdownItem[] => {
      const userLogs = state.logs.filter((l) => l.session_user_id === userId)
      const drinkMap = new Map<string, DrinkBreakdownItem>()
      for (const log of userLogs) {
        const drink = state.drinks.find((d) => d.id === log.drink_id)
        if (!drink || !log.drink_id) continue
        const existing = drinkMap.get(log.drink_id)
        if (existing) {
          existing.count += log.quantity
          existing.subtotal += log.unit_price * log.quantity
        } else {
          drinkMap.set(log.drink_id, {
            drink,
            count: log.quantity,
            subtotal: log.unit_price * log.quantity,
          })
        }
      }
      return Array.from(drinkMap.values())
    },
    [state.logs, state.drinks]
  )

  const lastDrink = useCallback(
    (userId: string) => {
      const lastLog = [...state.logs]
        .filter((l) => l.session_user_id === userId)
        .sort(
          (a, b) =>
            new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime()
        )[0]
      return lastLog ? state.drinks.find((d) => d.id === lastLog.drink_id) : undefined
    },
    [state.logs, state.drinks]
  )

  return (
    <SessionContext.Provider
      value={{
        ...state,
        addUser,
        removeUser,
        updateUser,
        addDrinks,
        updateDrink,
        removeDrink,
        clearAllDrinks,
        updatePub,
        updateMenuPhoto,
        incrementDrink,
        decrementDrink,
        closeSession,
        drinkCount,
        userTotal,
        userDrinkBreakdown,
        sessionTotal,
        sessionDrinkCount,
        lastDrink,
      }}
    >
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  return useContext(SessionContext)
}

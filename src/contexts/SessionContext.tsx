'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
} from 'react'
import { supabase } from '@/lib/supabase'
import { getAvatarColor } from '@/lib/colors'
import type { Drink, DrinkLog, Pub, Session, SessionUser } from '@/types'

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
  | { type: 'ADD_DRINKS'; payload: Drink[] }
  | { type: 'ADD_LOG'; payload: DrinkLog }
  | { type: 'REMOVE_LOG'; payload: string }
  | { type: 'CLOSE_SESSION'; payload: string }

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
    case 'ADD_DRINKS':
      return { ...state, drinks: [...state.drinks, ...action.payload] }
    case 'ADD_LOG':
      return { ...state, logs: [...state.logs, action.payload] }
    case 'REMOVE_LOG':
      return { ...state, logs: state.logs.filter((l) => l.id !== action.payload) }
    case 'CLOSE_SESSION':
      if (!state.session) return state
      return { ...state, session: { ...state.session, closed_at: action.payload } }
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

interface SessionContextValue extends State {
  addUser: (name: string) => Promise<void>
  removeUser: (id: string) => Promise<void>
  addDrinks: (
    items: { name: string; priceSmall: number | null; priceLarge: number | null }[]
  ) => Promise<void>
  incrementDrink: (userId: string, drink: Drink) => Promise<void>
  decrementDrink: (userId: string, drinkId: string) => Promise<void>
  closeSession: () => Promise<void>
  /** Count of a specific drink for a specific user */
  drinkCount: (userId: string, drinkId: string) => number
  /** Total spent by a specific user */
  userTotal: (userId: string) => number
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
  addDrinks: async () => {},
  incrementDrink: async () => {},
  decrementDrink: async () => {},
  closeSession: async () => {},
  drinkCount: () => 0,
  userTotal: () => 0,
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

  // Load everything on mount
  useEffect(() => {
    let cancelled = false

    async function load() {
      dispatch({ type: 'SET_LOADING', payload: true })

      // Fetch pub
      const { data: pub, error: pubErr } = await supabase
        .from('pubs')
        .select('*')
        .eq('id', pubId)
        .single()

      if (pubErr || !pub) {
        if (!cancelled) dispatch({ type: 'SET_ERROR', payload: 'Hospodu se nepodařilo načíst.' })
        return
      }

      // Find or create active session
      let session: Session | null = null
      const { data: existingSession } = await supabase
        .from('sessions')
        .select('*')
        .eq('pub_id', pubId)
        .is('closed_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existingSession) {
        session = existingSession
      } else {
        const { data: newSession, error: sessionErr } = await supabase
          .from('sessions')
          .insert({ pub_id: pubId })
          .select()
          .single()
        if (sessionErr || !newSession) {
          if (!cancelled) dispatch({ type: 'SET_ERROR', payload: 'Nepodařilo se vytvořit session.' })
          return
        }
        session = newSession
      }

      // Narrow: session is guaranteed non-null here (we either used existing or created new)
      if (!session) {
        if (!cancelled) dispatch({ type: 'SET_ERROR', payload: 'Session nebyla nalezena.' })
        return
      }

      // Fetch drinks
      const { data: drinks } = await supabase
        .from('drinks')
        .select('*')
        .eq('pub_id', pubId)
        .order('created_at')

      // Fetch users
      const { data: users } = await supabase
        .from('session_users')
        .select('*')
        .eq('session_id', session.id)
        .order('created_at')

      // Fetch logs
      const { data: logs } = await supabase
        .from('drink_logs')
        .select('*')
        .eq('session_id', session.id)
        .order('logged_at')

      if (!cancelled) {
        dispatch({
          type: 'INIT',
          payload: {
            pub,
            session,
            drinks: drinks ?? [],
            users: users ?? [],
            logs: logs ?? [],
          },
        })
      }
    }

    load()
    return () => { cancelled = true }
  }, [pubId])

  // ── Actions ────────────────────────────────────────────────

  const addUser = useCallback(
    async (name: string) => {
      if (!state.session) return
      const avatar_color = getAvatarColor(name)
      const { data, error } = await supabase
        .from('session_users')
        .insert({ session_id: state.session.id, name, avatar_color })
        .select()
        .single()
      if (!error && data) dispatch({ type: 'ADD_USER', payload: data })
    },
    [state.session]
  )

  const removeUser = useCallback(async (id: string) => {
    await supabase.from('session_users').delete().eq('id', id)
    dispatch({ type: 'REMOVE_USER', payload: id })
  }, [])

  const addDrinks = useCallback(
    async (
      items: { name: string; priceSmall: number | null; priceLarge: number | null }[]
    ) => {
      if (!state.pub) return
      const rows = items.map((item) => ({
        pub_id: state.pub!.id,
        name: item.name,
        price_small: item.priceSmall,
        price_large: item.priceLarge,
      }))
      const { data, error } = await supabase.from('drinks').insert(rows).select()
      if (!error && data) dispatch({ type: 'ADD_DRINKS', payload: data })
    },
    [state.pub]
  )

  const incrementDrink = useCallback(
    async (userId: string, drink: Drink) => {
      if (!state.session) return
      const unitPrice = drink.price_large ?? drink.price_small ?? 0
      // Optimistic
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
        .insert({
          session_id: state.session.id,
          session_user_id: userId,
          drink_id: drink.id,
          quantity: 1,
          unit_price: unitPrice,
        })
        .select()
        .single()

      if (error) {
        dispatch({ type: 'REMOVE_LOG', payload: tempId })
      } else if (data) {
        // Replace temp entry with real one
        dispatch({ type: 'REMOVE_LOG', payload: tempId })
        dispatch({ type: 'ADD_LOG', payload: data })
      }
    },
    [state.session]
  )

  const decrementDrink = useCallback(
    async (userId: string, drinkId: string) => {
      // Find and remove the most recent log for this user+drink
      const lastLog = [...state.logs]
        .filter((l) => l.session_user_id === userId && l.drink_id === drinkId)
        .sort(
          (a, b) =>
            new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime()
        )[0]
      if (!lastLog) return

      dispatch({ type: 'REMOVE_LOG', payload: lastLog.id })
      await supabase.from('drink_logs').delete().eq('id', lastLog.id)
    },
    [state.logs]
  )

  const closeSession = useCallback(async () => {
    if (!state.session) return
    const closedAt = new Date().toISOString()
    await supabase
      .from('sessions')
      .update({ closed_at: closedAt })
      .eq('id', state.session.id)
    dispatch({ type: 'CLOSE_SESSION', payload: closedAt })
  }, [state.session])

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
        addDrinks,
        incrementDrink,
        decrementDrink,
        closeSession,
        drinkCount,
        userTotal,
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

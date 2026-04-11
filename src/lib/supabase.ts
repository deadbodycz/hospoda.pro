import { createClient } from '@supabase/supabase-js'

// Fallback to placeholder so the module loads at build time without .env.local
// At runtime, real env vars must be set – requests will fail otherwise.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ALLOWED_STATUSES = ['active', 'trialing']

export async function verifyProUser(req: Request): Promise<boolean> {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return false
  const token = auth.slice(7)
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return false
  const { data: profile } = await supabaseAdmin
    .from('profiles').select('subscription_status').eq('id', user.id).single()
  return ALLOWED_STATUSES.includes(profile?.subscription_status ?? '')
}

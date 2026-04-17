import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Admin client — service role key bypasses Storage RLS
// sb_publishable_ klíč nefunguje se Storage API (není JWT formát)
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function verifyProUser(req: Request): Promise<boolean> {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return false
  const token = auth.slice(7)
  const { data: { user } } = await adminSupabase.auth.getUser(token)
  if (!user) return false
  const { data: profile } = await adminSupabase
    .from('profiles').select('subscription_status').eq('id', user.id).single()
  return profile?.subscription_status === 'active'
}

export async function POST(req: NextRequest) {
  const isPro = await verifyProUser(req)
  if (!isPro) {
    return NextResponse.json({ error: 'Vyžaduje PRO předplatné' }, { status: 403 })
  }

  try {
    const { base64, pubId } = await req.json() as { base64: string; pubId: string }

    if (!base64 || !pubId) {
      return NextResponse.json({ error: 'Chybí base64 nebo pubId' }, { status: 400 })
    }

    const byteChars = atob(base64)
    const byteArr = new Uint8Array(byteChars.length)
    for (let i = 0; i < byteChars.length; i++) {
      byteArr[i] = byteChars.charCodeAt(i)
    }
    const blob = new Blob([byteArr], { type: 'image/jpeg' })

    const { error } = await adminSupabase.storage
      .from('menu-photos')
      .upload(`${pubId}.jpg`, blob, { upsert: true, contentType: 'image/jpeg' })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data } = adminSupabase.storage
      .from('menu-photos')
      .getPublicUrl(`${pubId}.jpg`)

    const url = `${data.publicUrl}?t=${Date.now()}`
    return NextResponse.json({ url })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Chyba uploadu' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const ALLOWED_STATUSES = new Set(['free', 'active', 'trialing', 'past_due', 'canceled', 'unpaid'])

export const runtime = 'nodejs'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  async function updateProfile(customerId: string, status: string, tier: string, endsAt: string | null) {
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('id').eq('stripe_customer_id', customerId).single()
    if (!profile) {
      console.error(`[webhook] Profile not found for customer: ${customerId}`)
      return
    }
    const { error } = await supabaseAdmin.from('profiles').update({
      subscription_status: status,
      subscription_tier: tier,
      subscription_ends_at: endsAt,
      updated_at: new Date().toISOString(),
    }).eq('id', profile.id)
    if (error) {
      console.error(`[webhook] Failed to update profile ${profile.id}:`, error.message)
    }
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const rawStatus = sub.status as string
      const status = ALLOWED_STATUSES.has(rawStatus) ? rawStatus : 'past_due'
      const tier = sub.items.data[0]?.price.id === process.env.STRIPE_YEARLY_PRICE_ID ? 'yearly' : 'monthly'
      // V Stripe v22 je current_period_end na SubscriptionItem, ne na Subscription
      const periodEnd = sub.items.data[0]?.current_period_end
      const endsAt = periodEnd != null ? new Date(periodEnd * 1000).toISOString() : null
      await updateProfile(sub.customer as string, status, tier, endsAt)
      break
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await updateProfile(sub.customer as string, 'free', 'free', null)
      break
    }
  }

  return NextResponse.json({ received: true })
}

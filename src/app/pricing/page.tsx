'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Zap } from 'lucide-react'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'

const FREE_FEATURES = [
  'Počítání nápojů',
  'Ruční přidání nápoje (název + cena)',
  'Rozpis po lidech + celková útrata',
  'Dark/Light mode + PWA',
]

const PRO_FEATURES = [
  'Vše z Free',
  'AI skenování ceníku (OCR)',
  'Vyhledávání hospod na mapě',
  'Uložení do cloudu + sync',
  'Export účtu (PDF/CSV)',
  'Historie session + statistiky',
]

export default function PricingPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, isPro } = useSubscription()
  const [loading, setLoading] = useState<'monthly' | 'yearly' | null>(null)

  async function handleCheckout(tier: 'monthly' | 'yearly') {
    if (!user) {
      router.push('/account')
      return
    }

    setLoading(tier)
    const { data: { session } } = await supabase.auth.getSession()

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ tier }),
      })

      const json = await res.json() as { url?: string; error?: string }

      if (!res.ok || !json.url) {
        toast(json.error ?? 'Nepodařilo se vytvořit platbu.', 'error')
        return
      }

      window.location.href = json.url
    } catch {
      toast('Nepodařilo se připojit k platební bráně.', 'error')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center px-4 pt-16 pb-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-on-surface">Vyber si plán</h1>
          <p className="text-sm text-on-surface-variant">Začni zdarma, upgraduj kdykoli</p>
        </div>

        {/* Free karta */}
        <div className="bg-surface-container rounded-2xl p-5 space-y-4 border border-outline-variant">
          <div>
            <p className="font-semibold text-on-surface">Free</p>
            <p className="text-2xl font-mono font-bold text-on-surface mt-1 tabular-nums">0 Kč</p>
          </div>
          <ul className="space-y-2">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-on-surface-variant">
                <Check className="w-4 h-4 text-primary flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <button
            onClick={() => router.push('/')}
            className="w-full border border-outline-variant rounded-xl py-2.5 text-sm text-on-surface active:opacity-70 transition-opacity"
          >
            Pokračovat zdarma
          </button>
        </div>

        {/* PRO karta */}
        <div className="bg-primary/10 rounded-2xl p-5 space-y-4 border border-primary/30">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-on-surface">PRO</p>
                <span className="bg-primary text-on-primary text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wider">
                  Doporučujeme
                </span>
              </div>
              <p className="text-2xl font-mono font-bold text-on-surface mt-1 tabular-nums">49 Kč</p>
              <p className="text-xs text-on-surface-variant">/ měsíc</p>
            </div>
            <Zap className="w-5 h-5 text-primary mt-1" />
          </div>

          <ul className="space-y-2">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-on-surface">
                <Check className="w-4 h-4 text-primary flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          {isPro ? (
            <div className="text-center text-sm text-primary font-medium py-2">
              Máš PRO aktivní
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={() => handleCheckout('monthly')}
                disabled={loading !== null}
                className="w-full bg-primary text-on-primary rounded-xl py-3 text-sm font-medium active:scale-95 transition-transform disabled:opacity-60"
              >
                {loading === 'monthly' ? 'Načítám…' : 'Měsíčně — 49 Kč / měsíc'}
              </button>
              <button
                onClick={() => handleCheckout('yearly')}
                disabled={loading !== null}
                className="w-full bg-surface-container border border-primary/40 text-on-surface rounded-xl py-3 text-sm font-medium active:scale-95 transition-transform disabled:opacity-60"
              >
                {loading === 'yearly' ? 'Načítám…' : 'Ročně — 490 Kč / rok · ušetříš 98 Kč'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

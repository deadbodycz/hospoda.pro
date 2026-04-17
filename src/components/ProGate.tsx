'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock } from 'lucide-react'
import { useSubscription } from '@/contexts/SubscriptionContext'

const FEATURE_LABELS: Record<string, string> = {
  scan: 'AI skenování ceníku',
  map: 'Vyhledávání hospod na mapě',
  export: 'Export účtu',
  history: 'Historie session',
}

export function ProGate({
  feature,
  children,
}: {
  feature: string
  children: React.ReactNode
}) {
  const { isPro, loading } = useSubscription()
  const router = useRouter()
  const [dismissed, setDismissed] = useState(false)

  if (loading) return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (isPro) return <>{children}</>
  if (dismissed) return null

  const label = FEATURE_LABELS[feature] ?? feature

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background px-6 gap-6">
      <div className="bg-surface-container rounded-2xl p-6 w-full max-w-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-on-surface text-sm">Funkce PRO</p>
            <p className="text-xs text-on-surface-variant">{label}</p>
          </div>
        </div>

        <p className="text-sm text-on-surface-variant">
          Tato funkce je dostupná pouze v PRO verzi. Odemkni neomezený přístup.
        </p>

        <div className="space-y-2">
          <button
            onClick={() => router.push('/pricing')}
            className="w-full bg-primary text-on-primary rounded-xl py-3 text-sm font-medium active:scale-95 transition-transform"
          >
            Přejít na PRO
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="w-full text-on-surface-variant text-sm py-2 active:opacity-60 transition-opacity"
          >
            Možná jindy
          </button>
        </div>

        <div className="border-t border-outline-variant pt-3 space-y-1">
          <div className="flex justify-between text-xs text-on-surface-variant">
            <span>Měsíčně</span>
            <span className="font-mono">49 Kč / měsíc</span>
          </div>
          <div className="flex justify-between text-xs text-on-surface-variant">
            <span>Ročně</span>
            <span className="font-mono text-primary">490 Kč / rok</span>
          </div>
        </div>
      </div>
    </div>
  )
}

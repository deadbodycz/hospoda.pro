'use client'

import { useSubscription } from '@/contexts/SubscriptionContext'

export function ProBadge() {
  const { isPro } = useSubscription()
  if (!isPro) return null
  return (
    <span className="bg-primary text-on-primary text-[10px] px-1.5 py-0.5 rounded-full font-bold tracking-wider">
      PRO
    </span>
  )
}

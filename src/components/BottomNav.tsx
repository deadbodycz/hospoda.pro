'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { Layers, Users, Receipt, Settings, MapPin, User } from 'lucide-react'

interface BottomNavProps {
  pubId?: string
}

export function BottomNav({ pubId }: BottomNavProps) {
  const pathname = usePathname()
  const { toast } = useToast()
  const { isPro } = useSubscription()

  const tabs = pubId
    ? [
        { icon: Layers,   label: 'Počítej',    href: `/${pubId}`,          exact: true  },
        { icon: Users,    label: 'Lidé',        href: `/${pubId}/users`,    exact: false },
        { icon: Receipt,  label: 'Účet',        href: `/${pubId}/account`,  exact: false },
        { icon: Settings, label: 'Nastavení',   href: `/${pubId}/settings`, exact: false },
      ]
    : [
        { icon: MapPin,   label: 'Hospody',     href: '/',                             exact: true  },
        { icon: Users,    label: 'Lidé',        href: null,                            exact: false },
        { icon: Receipt,  label: 'Účet',        href: null,                            exact: false },
        { icon: Settings, label: 'Nastavení',   href: null,                            exact: false },
        { icon: User,     label: 'Profil',      href: isPro ? '/account' : '/pricing', exact: false },
      ]

  const isActive = (href: string | null, exact: boolean) => {
    if (!href) return false
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <nav
      className="fixed bottom-0 left-0 w-full z-50 px-3"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
    >
      <div className="bg-surface border border-outline-variant rounded-2xl px-4 py-2 flex justify-around items-center">
        {tabs.map((tab) => {
          const active = isActive(tab.href, tab.exact)
          const Icon = tab.icon

          if (!tab.href) {
            return (
              <button
                key={tab.label}
                onClick={() => toast('Přichází brzy', 'info')}
                className="flex flex-col items-center gap-1 min-w-[48px] min-h-[48px] justify-center"
              >
                <div className="w-7 h-7 flex items-center justify-center rounded-lg">
                  <Icon className="w-4 h-4 text-outline" />
                </div>
                <span className="font-mono text-[9px] uppercase tracking-widest text-outline">
                  {tab.label}
                </span>
              </button>
            )
          }

          return (
            <Link
              key={tab.label}
              href={tab.href}
              className="flex flex-col items-center gap-1 min-w-[48px] min-h-[48px] justify-center active:scale-95 transition-transform"
            >
              <div
                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                  active ? 'bg-primary' : ''
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${active ? 'text-on-primary' : 'text-outline'}`}
                />
              </div>
              <span
                className={`font-mono text-[9px] uppercase tracking-widest ${
                  active ? 'text-primary' : 'text-outline'
                }`}
              >
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

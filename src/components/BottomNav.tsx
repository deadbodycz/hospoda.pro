'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'

interface BottomNavProps {
  pubId?: string
}

export function BottomNav({ pubId }: BottomNavProps) {
  const pathname = usePathname()
  const { toast } = useToast()

  const tabs = pubId
    ? [
        {
          icon: 'add_circle',
          label: 'Track',
          href: `/${pubId}`,
          exact: true,
        },
        {
          icon: 'group',
          label: 'Lidé',
          href: `/${pubId}/users`,
          exact: false,
        },
        {
          icon: 'receipt_long',
          label: 'Účet',
          href: null,
          exact: false,
        },
        {
          icon: 'settings',
          label: 'Nastavení',
          href: null,
          exact: false,
        },
      ]
    : [
        {
          icon: 'local_bar',
          label: 'Hospody',
          href: '/',
          exact: true,
        },
        {
          icon: 'group',
          label: 'Lidé',
          href: null,
          exact: false,
        },
        {
          icon: 'receipt_long',
          label: 'Účet',
          href: null,
          exact: false,
        },
        {
          icon: 'settings',
          label: 'Nastavení',
          href: null,
          exact: false,
        },
      ]

  const isActive = (href: string | null, exact: boolean) => {
    if (!href) return false
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <nav
      className="fixed bottom-0 left-0 w-full h-20 bg-zinc-900/80 backdrop-blur-xl border-t-2 border-zinc-800/20 px-6 flex justify-around items-center z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map((tab) => {
        const active = isActive(tab.href, tab.exact)

        if (!tab.href) {
          return (
            <button
              key={tab.label}
              onClick={() => toast('Přichází brzy', 'info')}
              className="flex flex-col items-center justify-center text-zinc-500 p-2 hover:text-amber-400 active:translate-y-0.5 transition-all duration-200 min-w-[48px] min-h-[48px]"
            >
              <span className="material-symbols-outlined">{tab.icon}</span>
              <span className="font-mono text-[10px] uppercase tracking-widest mt-1">
                {tab.label}
              </span>
            </button>
          )
        }

        return (
          <Link
            key={tab.label}
            href={tab.href}
            className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-200 active:translate-y-0.5 min-w-[48px] min-h-[48px] ${
              active
                ? 'bg-amber-500/10 text-amber-500 px-6'
                : 'text-zinc-500 hover:text-amber-400'
            }`}
          >
            <span
              className={`material-symbols-outlined ${active ? 'icon-filled' : ''}`}
            >
              {tab.icon}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest mt-1">
              {tab.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

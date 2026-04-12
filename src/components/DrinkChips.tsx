'use client'

import type { Drink } from '@/types'

interface DrinkChipsProps {
  drinks: Drink[]
  selected: string | null
  onSelect: (id: string) => void
}

function formatPrice(drink: Drink): string {
  const price = drink.price_large ?? drink.price_small
  if (price === null) return ''
  return `${Math.round(price)} Kč`
}

export function DrinkChips({ drinks, selected, onSelect }: DrinkChipsProps) {
  if (drinks.length === 0) return null

  return (
    <section
      className="sticky top-16 z-40 bg-background/95 backdrop-blur-sm -mx-4 px-4 pb-3 pt-2"
      aria-label="Výběr nápoje"
    >
      <div className="bg-surface-container border-2 border-outline-variant/20 rounded-xl overflow-hidden max-h-[38vh] overflow-y-auto">
        {drinks.map((drink, idx) => {
          const active = selected === drink.id
          const isLast = idx === drinks.length - 1
          return (
            <button
              key={drink.id}
              onClick={() => onSelect(drink.id)}
              className={`
                w-full flex items-center justify-between px-4 py-2.5 text-left transition-all active:scale-[0.99]
                ${!isLast ? 'border-b border-outline-variant/15' : ''}
                ${active
                  ? 'bg-beer-gradient text-on-primary-container'
                  : 'text-on-surface hover:bg-surface-container-high'
                }
              `}
              aria-pressed={active}
            >
              <div className="flex items-center gap-2 min-w-0">
                {active && (
                  <span className="material-symbols-outlined text-base icon-filled flex-shrink-0" aria-hidden>
                    sports_bar
                  </span>
                )}
                <span className={`text-sm font-medium truncate ${active ? '' : 'pl-6'}`}>
                  {drink.name}
                </span>
              </div>
              <span className={`text-sm font-mono flex-shrink-0 ml-3 ${active ? 'opacity-80' : 'text-outline'}`}>
                {formatPrice(drink)}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

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
  return ` · ${Math.round(price)} Kč`
}

export function DrinkChips({ drinks, selected, onSelect }: DrinkChipsProps) {
  if (drinks.length === 0) return null

  return (
    <section
      className="flex overflow-x-auto gap-2 pb-6 pt-2 sticky top-16 bg-background/95 backdrop-blur-sm z-40 -mx-4 px-4"
      aria-label="Výběr nápoje"
    >
      {drinks.map((drink) => {
        const active = selected === drink.id
        return (
          <button
            key={drink.id}
            onClick={() => onSelect(drink.id)}
            className={`
              flex-shrink-0 px-5 py-2.5 rounded-full border-2 font-bold transition-all active:scale-95
              flex items-center gap-2 text-sm whitespace-nowrap
              ${
                active
                  ? 'bg-beer-gradient text-on-primary-container border-primary-container shadow-lg brewery-shadow'
                  : 'bg-surface-container border-outline-variant text-on-surface-variant hover:bg-surface-container-high'
              }
            `}
            aria-pressed={active}
          >
            {active && (
              <span
                className="material-symbols-outlined text-lg icon-filled"
                aria-hidden
              >
                sports_bar
              </span>
            )}
            {drink.name}
            <span className={active ? 'opacity-80' : 'opacity-60'}>
              {formatPrice(drink)}
            </span>
          </button>
        )
      })}
    </section>
  )
}

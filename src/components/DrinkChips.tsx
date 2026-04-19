'use client'

import { useState } from 'react'
import { Beer, Wine, GlassWater, Coffee, Info, type LucideIcon } from 'lucide-react'
import type { Drink } from '@/types'
import BeerInfoSheet from './BeerInfoSheet'

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

function getDrinkIcon(name: string): LucideIcon {
  const n = name.toLowerCase()
  if (n.includes('víno') || n.includes('vino') || n.includes('wine')) return Wine
  if (n.includes('káva') || n.includes('kava') || n.includes('coffee')) return Coffee
  if (n.includes('voda') || n.includes('water') || n.includes('džus') || n.includes('limonáda')) return GlassWater
  if (n.includes('panák') || n.includes('shot') || n.includes('slivovice') || n.includes('rum') || n.includes('vodka')) return GlassWater
  return Beer
}

export function DrinkChips({ drinks, selected, onSelect }: DrinkChipsProps) {
  const [infoBeer, setInfoBeer] = useState<string | null>(null)

  if (drinks.length === 0) return null

  return (
    <>
      <section
        className="sticky top-14 z-40 bg-background/95 backdrop-blur-sm -mx-4 px-4 pb-3 pt-2"
        aria-label="Výběr nápoje"
      >
        <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden max-h-[40vh] overflow-y-auto">
          {drinks.map((drink, idx) => {
            const active = selected === drink.id
            const isLast = idx === drinks.length - 1
            const Icon = getDrinkIcon(drink.name)

            return (
              <div
                key={drink.id}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 transition-colors
                  ${!isLast ? 'border-b border-outline-variant' : ''}
                  ${active ? 'bg-primary/12' : 'hover:bg-surface-container'}
                `}
              >
                <button
                  onClick={() => onSelect(drink.id)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  aria-pressed={active}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-[#a8bc00]' : 'text-outline'}`} />
                  <span className={`text-sm font-medium flex-1 truncate ${active ? 'text-[#a8bc00]' : 'text-on-surface-variant'}`}>
                    {drink.name}
                  </span>
                  <span className={`text-sm font-mono flex-shrink-0 tabular-nums ${active ? 'text-[#a8bc00] opacity-70' : 'text-outline'}`}>
                    {formatPrice(drink)}
                  </span>
                </button>
                <button
                  onClick={() => setInfoBeer(drink.name)}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-surface-container-high active:scale-90 transition-all flex-shrink-0"
                  aria-label={`Info o ${drink.name}`}
                >
                  <Info className={`w-3.5 h-3.5 ${active ? 'text-[#a8bc00] opacity-60' : 'text-outline'}`} />
                </button>
              </div>
            )
          })}
        </div>
      </section>
      <BeerInfoSheet beerName={infoBeer} onClose={() => setInfoBeer(null)} />
    </>
  )
}

'use client'

import { Minus, Plus } from 'lucide-react'
import { getAvatarStyle, getInitials } from '@/lib/colors'
import { haptic } from '@/lib/haptics'
import type { Drink, SessionUser } from '@/types'
import type { DrinkBreakdownItem } from '@/contexts/SessionContext'

interface UserCardProps {
  user: SessionUser
  count: number
  total: number
  selectedDrink: Drink | null
  drinkBreakdown: DrinkBreakdownItem[]
  onIncrement: () => void
  onDecrement: () => void
}

export function UserCard({
  user,
  count,
  total,
  selectedDrink,
  drinkBreakdown,
  onIncrement,
  onDecrement,
}: UserCardProps) {
  const av = getAvatarStyle(user.name)
  const initials = getInitials(user.name)

  function handleIncrement() {
    haptic(10)
    onIncrement()
  }

  function handleDecrement() {
    if (count === 0) return
    haptic(10)
    onDecrement()
  }

  return (
    <article className="bg-surface border border-outline-variant rounded-2xl p-4">
      {/* Top row: avatar + name + counter */}
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg border flex items-center justify-center font-bold text-xs flex-shrink-0"
          style={{ backgroundColor: av.bg, color: av.color, borderColor: av.border }}
          aria-hidden
        >
          {initials}
        </div>

        <span className="font-semibold text-on-surface text-sm flex-1 truncate">
          {user.name}
        </span>

        {/* Counter */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleDecrement}
            disabled={count === 0}
            aria-label={`Ubrat nápoj pro ${user.name}`}
            className="w-7 h-7 rounded-lg border border-outline-variant flex items-center justify-center
              active:scale-90 transition-transform hover:bg-surface-container
              disabled:opacity-30 disabled:cursor-not-allowed p-1"
          >
            <Minus className="w-3.5 h-3.5 text-on-surface-variant" />
          </button>

          <span className="text-base font-mono font-bold text-on-surface tabular-nums min-w-[20px] text-center">
            {count}
          </span>

          <button
            onClick={handleIncrement}
            disabled={!selectedDrink}
            aria-label={`Přidat nápoj pro ${user.name}`}
            className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center
              active:scale-90 transition-transform accent-shadow
              disabled:opacity-40 disabled:cursor-not-allowed p-1"
          >
            <Plus className="w-3.5 h-3.5 text-on-primary" />
          </button>
        </div>
      </div>

      {/* Drink breakdown */}
      {drinkBreakdown.length > 0 && (
        <div className="mt-3 pt-3 border-t border-outline-variant space-y-1.5">
          {drinkBreakdown.map(({ drink, count: cnt, subtotal }) => (
            <div key={drink.id} className="flex justify-between items-center">
              <span className="text-xs text-on-surface-variant truncate max-w-[60%]">
                {cnt}× {drink.name}
              </span>
              <span className="text-xs font-mono text-outline tabular-nums">
                {Math.round(subtotal)} Kč
              </span>
            </div>
          ))}
        </div>
      )}
    </article>
  )
}

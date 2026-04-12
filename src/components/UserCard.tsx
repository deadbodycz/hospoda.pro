'use client'

import { getAvatarClasses, getInitials } from '@/lib/colors'
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
  const avatar = getAvatarClasses(user.avatar_color)
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
    <article className="bg-surface-container-low rounded-xl p-4 border-2 border-transparent hover:border-outline-variant/20 transition-all">
      {/* Header row */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2.5">
          {/* Avatar */}
          <div
            className={`
              w-10 h-10 rounded-full flex items-center justify-center
              font-bold text-sm border-2 flex-shrink-0
              ${avatar.bg} ${avatar.text} ${avatar.border}
            `}
            aria-hidden
          >
            {initials}
          </div>
          {/* Name */}
          <h3 className="font-bold text-on-surface text-base leading-tight">
            {user.name}
          </h3>
        </div>

        {/* Total cost */}
        <span className="font-mono font-bold text-primary text-base tabular-nums">
          {Math.round(total)} Kč
        </span>
      </div>

      {/* Counter row */}
      <div className="flex items-center justify-between px-1">
        {/* Minus button */}
        <button
          onClick={handleDecrement}
          disabled={count === 0}
          aria-label={`Ubrat nápoj pro ${user.name}`}
          className="w-11 h-11 rounded-2xl border-2 border-outline flex items-center justify-center text-on-surface
            active:scale-90 transition-transform hover:bg-surface-container-high
            disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-xl">remove</span>
        </button>

        {/* Count */}
        <span className="text-4xl font-mono font-black text-on-surface tracking-tighter tabular-nums select-none">
          {count}
        </span>

        {/* Plus button */}
        <button
          onClick={handleIncrement}
          disabled={!selectedDrink}
          aria-label={`Přidat nápoj pro ${user.name}`}
          className="w-11 h-11 rounded-2xl bg-beer-gradient text-on-primary-container flex items-center justify-center
            brewery-shadow active:translate-y-0.5 transition-all
            disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-xl font-bold">add</span>
        </button>
      </div>

      {/* Drink breakdown */}
      {drinkBreakdown.length > 0 && (
        <div className="mt-3 pt-3 border-t border-outline-variant/20 space-y-1">
          {drinkBreakdown.map(({ drink, count: cnt, subtotal }) => (
            <div key={drink.id} className="flex justify-between items-center">
              <span className="text-xs text-on-surface-variant truncate max-w-[60%]">
                {drink.name}
                <span className="text-outline ml-1">×{cnt}</span>
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

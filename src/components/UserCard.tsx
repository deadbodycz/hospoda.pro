'use client'

import { getAvatarClasses, getInitials } from '@/lib/colors'
import { haptic } from '@/lib/haptics'
import type { Drink, SessionUser } from '@/types'

interface UserCardProps {
  user: SessionUser
  count: number
  total: number
  lastDrink: Drink | undefined
  selectedDrink: Drink | null
  onIncrement: () => void
  onDecrement: () => void
}

export function UserCard({
  user,
  count,
  total,
  lastDrink,
  selectedDrink,
  onIncrement,
  onDecrement,
}: UserCardProps) {
  const avatar = getAvatarClasses(user.avatar_color)
  const initials = getInitials(user.name)
  const currentDrinkLabel = selectedDrink?.name ?? lastDrink?.name ?? '—'

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
    <article className="bg-surface-container-low rounded-xl p-5 border-2 border-transparent hover:border-outline-variant/20 transition-all">
      {/* Header row */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div
            className={`
              w-12 h-12 rounded-full flex items-center justify-center
              font-bold text-lg border-2
              ${avatar.bg} ${avatar.text} ${avatar.border}
            `}
            aria-hidden
          >
            {initials}
          </div>
          {/* Name + last drink */}
          <div>
            <h3 className="font-bold text-on-surface text-lg leading-tight">
              {user.name}
            </h3>
            <p className="text-zinc-500 text-sm font-medium truncate max-w-[140px]">
              {currentDrinkLabel}
            </p>
          </div>
        </div>

        {/* Total cost */}
        <div className="text-right">
          <span className="font-mono font-bold text-primary text-xl tabular-nums">
            {Math.round(total)} Kč
          </span>
        </div>
      </div>

      {/* Counter row */}
      <div className="flex items-center justify-between px-2">
        {/* Minus button */}
        <button
          onClick={handleDecrement}
          disabled={count === 0}
          aria-label={`Ubrat nápoj pro ${user.name}`}
          className="w-14 h-14 rounded-2xl border-2 border-outline flex items-center justify-center text-on-surface
            active:scale-90 transition-transform hover:bg-surface-container-high
            disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-2xl">remove</span>
        </button>

        {/* Count */}
        <span className="text-5xl font-mono font-black text-on-surface tracking-tighter tabular-nums select-none">
          {count}
        </span>

        {/* Plus button */}
        <button
          onClick={handleIncrement}
          disabled={!selectedDrink}
          aria-label={`Přidat nápoj pro ${user.name}`}
          className="w-14 h-14 rounded-2xl bg-beer-gradient text-on-primary-container flex items-center justify-center
            brewery-shadow active:translate-y-0.5 transition-all
            disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-3xl font-bold">add</span>
        </button>
      </div>
    </article>
  )
}

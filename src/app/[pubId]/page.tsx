'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ScanLine, Beer, UserPlus, AlertCircle } from 'lucide-react'
import { useSession } from '@/contexts/SessionContext'
import { DrinkChips } from '@/components/DrinkChips'
import { UserCard } from '@/components/UserCard'
import { BottomNav } from '@/components/BottomNav'
import { ThemeToggle } from '@/components/ThemeToggle'
import type { Drink } from '@/types'

export default function DraughtCounterPage({
  params,
}: {
  params: { pubId: string }
}) {
  const {
    pub,
    session,
    drinks,
    users,
    loading,
    error,
    incrementDrink,
    decrementDrink,
    drinkCount,
    userDrinkBreakdown,
    userTotal,
  } = useSession()

  const [selectedDrinkId, setSelectedDrinkId] = useState<string | null>(null)

  const selectedDrink: Drink | null =
    drinks.find((d) => d.id === selectedDrinkId) ?? drinks[0] ?? null

  // Auto-select first drink when drinks load
  if (!selectedDrinkId && drinks.length > 0) {
    setSelectedDrinkId(drinks[0].id)
  }

  if (loading) {
    return <LoadingSkeleton pubId={params.pubId} />
  }

  if (error || !pub) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-error mx-auto" />
          <p className="text-on-surface-variant text-sm">
            {error ?? 'Hospoda nenalezena.'}
          </p>
          <Link href="/" className="text-primary font-bold underline text-sm">
            Zpět na výběr hospody
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-background text-on-surface pb-24">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant h-14 flex items-center px-4 justify-between">
        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            className="w-9 h-9 flex items-center justify-center hover:bg-surface-container rounded-lg transition-colors active:scale-95"
            aria-label="Zpět"
          >
            <ArrowLeft className="w-5 h-5 text-on-surface-variant" />
          </Link>
          <div className="flex flex-col">
            <h1 className="text-on-surface font-bold tracking-tight text-base leading-tight">
              {pub.name}
            </h1>
            <span className="text-outline font-mono text-[10px] uppercase tracking-widest">
              {session?.closed_at ? 'uzavřeno' : 'v provozu'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Link
            href={`/${params.pubId}/scan`}
            className="w-9 h-9 flex items-center justify-center hover:bg-surface-container rounded-lg transition-colors active:scale-95"
            aria-label="Skenovat ceník"
          >
            <ScanLine className="w-5 h-5 text-outline" />
          </Link>
        </div>
      </header>

      <main
        className="pt-14 pb-4 px-4 max-w-md mx-auto"
        style={{ paddingTop: 'calc(3.5rem + env(safe-area-inset-top))' }}
      >
        {/* Drink chips (vertical list) */}
        {drinks.length > 0 ? (
          <DrinkChips
            drinks={drinks}
            selected={selectedDrink?.id ?? null}
            onSelect={setSelectedDrinkId}
          />
        ) : (
          <NoDrinksPrompt pubId={params.pubId} />
        )}

        {/* User cards */}
        {users.length === 0 ? (
          <NoUsersPrompt pubId={params.pubId} />
        ) : (
          <div className="space-y-3 mt-3">
            {users.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                count={drinkCount(user.id, selectedDrink?.id ?? '')}
                total={userTotal(user.id)}
                selectedDrink={selectedDrink}
                drinkBreakdown={userDrinkBreakdown(user.id)}
                onIncrement={() => {
                  if (selectedDrink) incrementDrink(user.id, selectedDrink)
                }}
                onDecrement={() => {
                  if (selectedDrink) decrementDrink(user.id, selectedDrink.id)
                }}
              />
            ))}
          </div>
        )}
      </main>

      <BottomNav pubId={params.pubId} />
    </div>
  )
}

function NoDrinksPrompt({ pubId }: { pubId: string }) {
  return (
    <div className="mt-8 text-center py-8 space-y-3">
      <Beer className="w-10 h-10 text-outline mx-auto" />
      <p className="text-on-surface-variant text-sm">Zatím žádné nápoje.</p>
      <div className="flex flex-col items-center gap-2">
        <Link
          href={`/${pubId}/settings`}
          className="inline-flex items-center gap-2 bg-primary text-on-primary font-bold px-5 py-2.5 rounded-xl accent-shadow text-sm"
        >
          <ScanLine className="w-4 h-4" />
          Přidat nápoj
        </Link>
      </div>
    </div>
  )
}

function NoUsersPrompt({ pubId }: { pubId: string }) {
  return (
    <div className="mt-8 text-center py-8 space-y-3">
      <UserPlus className="w-10 h-10 text-outline mx-auto" />
      <p className="text-on-surface-variant text-sm">Nikdo u stolu. Přidej lidi!</p>
      <Link
        href={`/${pubId}/users`}
        className="inline-flex items-center gap-2 bg-primary text-on-primary font-bold px-5 py-2.5 rounded-xl accent-shadow text-sm"
      >
        <UserPlus className="w-4 h-4" />
        Přidat lidi
      </Link>
    </div>
  )
}

function LoadingSkeleton({ pubId }: { pubId: string }) {
  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant h-14 flex items-center px-4">
        <div className="w-32 h-4 bg-surface-container-high rounded-full animate-pulse" />
      </header>
      <main className="pt-20 px-4 max-w-md mx-auto space-y-3">
        <div className="h-28 bg-surface-container rounded-xl animate-pulse" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-surface-container-low rounded-xl p-4 h-28 animate-pulse" />
        ))}
      </main>
      <BottomNav pubId={pubId} />
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession } from '@/contexts/SessionContext'
import { DrinkChips } from '@/components/DrinkChips'
import { UserCard } from '@/components/UserCard'
import { BottomNav } from '@/components/BottomNav'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useToast } from '@/components/ui/Toast'
import { Modal } from '@/components/ui/Modal'
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
    userTotal,
    sessionTotal,
    sessionDrinkCount,
    lastDrink,
    closeSession,
  } = useSession()

  const router = useRouter()
  const { toast } = useToast()
  const [selectedDrinkId, setSelectedDrinkId] = useState<string | null>(null)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [closing, setClosing] = useState(false)

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
          <span className="material-symbols-outlined text-5xl text-error">error</span>
          <p className="text-on-surface-variant">
            {error ?? 'Hospoda nenalezena.'}
          </p>
          <Link href="/" className="text-primary font-bold underline">
            Zpět na výběr hospody
          </Link>
        </div>
      </div>
    )
  }

  async function handleClose() {
    setClosing(true)
    await closeSession()
    setClosing(false)
    setShowCloseConfirm(false)
    toast('Účet byl uzavřen.', 'success')
    router.push('/')
  }

  return (
    <div className="min-h-[100dvh] bg-background text-on-surface pb-48">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-zinc-900/60 backdrop-blur-md border-b-2 border-zinc-800/20 h-16 flex items-center px-4 justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="w-10 h-10 flex items-center justify-center hover:bg-zinc-800/50 rounded-full transition-colors active:scale-95"
            aria-label="Zpět"
          >
            <span className="material-symbols-outlined text-on-surface">arrow_back</span>
          </Link>
          <div className="flex flex-col">
            <h1 className="text-on-surface font-bold tracking-tight text-lg leading-tight">
              {pub.name}
            </h1>
            <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest">
              {session?.closed_at ? 'uzavřeno' : 'v provozu'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Link
            href={`/${params.pubId}/scan`}
            className="w-10 h-10 flex items-center justify-center hover:bg-zinc-800/50 rounded-full transition-colors active:scale-95"
            aria-label="Skenovat ceník"
          >
            <span className="material-symbols-outlined text-zinc-400">photo_camera</span>
          </Link>
        </div>
      </header>

      <main
        className="pt-16 pb-4 px-4 max-w-md mx-auto"
        style={{ paddingTop: 'calc(4rem + env(safe-area-inset-top))' }}
      >
        {/* Drink chips */}
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
          <div className="space-y-4 mt-2">
            {users.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                count={drinkCount(user.id, selectedDrink?.id ?? '')}
                total={userTotal(user.id)}
                lastDrink={lastDrink(user.id)}
                selectedDrink={selectedDrink}
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

      {/* Summary bar */}
      {users.length > 0 && (
        <aside className="fixed bottom-24 left-4 right-4 z-40 bg-zinc-900 border-2 border-zinc-800/40 rounded-xl p-4 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest">
                Aktuální útrata
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-mono font-black text-on-surface tabular-nums">
                  {Math.round(sessionTotal)}
                </span>
                <span className="text-primary font-bold">Kč</span>
              </div>
            </div>
            <div className="text-right">
              <span className="px-3 py-1 bg-surface-variant rounded-full text-zinc-400 font-mono text-[10px] uppercase tracking-widest border border-zinc-800/60">
                {sessionDrinkCount} {sessionDrinkCount === 1 ? 'nápoj' : sessionDrinkCount < 5 ? 'nápoje' : 'nápojů'} celkem
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowCloseConfirm(true)}
            className="w-full py-4 bg-beer-gradient text-on-primary-container font-black uppercase tracking-widest rounded-2xl shadow-xl active:translate-y-1 transition-all border-b-4 border-amber-800/40 flex items-center justify-center gap-3"
          >
            <span className="material-symbols-outlined icon-filled">receipt_long</span>
            Uzavřít účet
          </button>
        </aside>
      )}

      <BottomNav pubId={params.pubId} />

      {/* Close session confirm */}
      <Modal
        open={showCloseConfirm}
        onClose={() => setShowCloseConfirm(false)}
        title="Uzavřít účet?"
      >
        <div className="space-y-5">
          <p className="text-on-surface-variant text-sm">
            Celková útrata:{' '}
            <span className="font-mono font-bold text-primary text-lg">
              {Math.round(sessionTotal)} Kč
            </span>
            {' '}za{' '}
            <span className="font-bold text-on-surface">{sessionDrinkCount}</span>{' '}
            {sessionDrinkCount === 1 ? 'nápoj' : sessionDrinkCount < 5 ? 'nápoje' : 'nápojů'}.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCloseConfirm(false)}
              className="flex-1 bg-surface-variant text-on-surface-variant font-bold py-3 rounded-2xl active:scale-95 transition-transform"
            >
              Zpět
            </button>
            <button
              onClick={handleClose}
              disabled={closing}
              className="flex-1 bg-beer-gradient text-on-primary-container font-bold py-3 rounded-2xl active:translate-y-0.5 transition-all disabled:opacity-40"
            >
              {closing ? 'Uzavírám…' : 'Uzavřít'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function NoDrinksPrompt({ pubId }: { pubId: string }) {
  return (
    <div className="mt-8 text-center py-8 space-y-3">
      <span className="material-symbols-outlined text-4xl text-outline-variant">menu_book</span>
      <p className="text-on-surface-variant text-sm">Zatím žádné nápoje.</p>
      <Link
        href={`/${pubId}/scan`}
        className="inline-flex items-center gap-2 bg-beer-gradient text-on-primary-container font-bold px-6 py-3 rounded-2xl brewery-shadow text-sm"
      >
        <span className="material-symbols-outlined text-lg">photo_camera</span>
        Skenovat ceník
      </Link>
    </div>
  )
}

function NoUsersPrompt({ pubId }: { pubId: string }) {
  return (
    <div className="mt-8 text-center py-8 space-y-3">
      <span className="material-symbols-outlined text-4xl text-outline-variant">group_add</span>
      <p className="text-on-surface-variant text-sm">Nikdo u stolu. Přidej lidi!</p>
      <Link
        href={`/${pubId}/users`}
        className="inline-flex items-center gap-2 bg-beer-gradient text-on-primary-container font-bold px-6 py-3 rounded-2xl brewery-shadow text-sm"
      >
        <span className="material-symbols-outlined text-lg">person_add</span>
        Přidat lidi
      </Link>
    </div>
  )
}

function LoadingSkeleton({ pubId }: { pubId: string }) {
  return (
    <div className="min-h-[100dvh] bg-background pb-48">
      <header className="fixed top-0 w-full z-50 bg-zinc-900/60 backdrop-blur-md border-b-2 border-zinc-800/20 h-16 flex items-center px-4">
        <div className="w-32 h-5 bg-surface-container-high rounded-full animate-pulse" />
      </header>
      <main className="pt-24 px-4 max-w-md mx-auto space-y-4">
        <div className="flex gap-2 py-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 w-32 bg-surface-container-high rounded-full animate-pulse flex-shrink-0" />
          ))}
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-surface-container-low rounded-xl p-5 h-36 animate-pulse" />
        ))}
      </main>
      <BottomNav pubId={pubId} />
    </div>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from '@/contexts/SessionContext'
import { BottomNav } from '@/components/BottomNav'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { getAvatarClasses, getInitials } from '@/lib/colors'

export default function AccountPage({
  params,
}: {
  params: { pubId: string }
}) {
  const {
    pub,
    session,
    users,
    loading,
    userDrinkBreakdown,
    userTotal,
    sessionTotal,
    sessionDrinkCount,
    closeSession,
  } = useSession()

  const router = useRouter()
  const { toast } = useToast()
  const [showConfirm, setShowConfirm] = useState(false)
  const [closing, setClosing] = useState(false)

  async function handleClose() {
    setClosing(true)
    await closeSession()
    setClosing(false)
    setShowConfirm(false)
    toast('Účet byl uzavřen.', 'success')
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-background pb-24">
        <header className="fixed top-0 w-full h-12 z-50 bg-zinc-950/60 backdrop-blur-md border-b-2 border-zinc-800/20 flex items-center px-4">
          <div className="w-32 h-4 bg-surface-container-high rounded-full animate-pulse" />
        </header>
        <main className="pt-16 px-4 max-w-md mx-auto space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-surface-container-low rounded-xl h-20 animate-pulse" />
          ))}
        </main>
        <BottomNav pubId={params.pubId} />
      </div>
    )
  }

  const isClosed = !!session?.closed_at

  return (
    <div className="min-h-[100dvh] bg-background text-on-surface pb-24">
      {/* Header */}
      <header className="fixed top-0 w-full h-12 z-50 bg-zinc-950/60 backdrop-blur-md border-b-2 border-zinc-800/20 flex items-center px-4 justify-between">
        <div className="flex items-center gap-2">
          <Link
            href={`/${params.pubId}`}
            className="w-9 h-9 flex items-center justify-center hover:bg-zinc-800/50 rounded-full transition-colors active:scale-95"
            aria-label="Zpět"
          >
            <span className="material-symbols-outlined text-on-surface text-xl">arrow_back</span>
          </Link>
          <span className="text-amber-500 font-bold tracking-tighter text-base">
            {pub?.name ?? 'Hospoda'}
          </span>
        </div>
        <ThemeToggle />
      </header>

      <main
        className="pt-12 px-4 max-w-md mx-auto space-y-4"
        style={{ paddingTop: 'calc(3rem + env(safe-area-inset-top))' }}
      >
        {/* Title */}
        <section className="space-y-1 pt-4">
          <p className="font-mono text-primary uppercase tracking-widest text-[10px]">
            {isClosed ? 'Uzavřený účet' : 'Aktuální účet'}
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-on-surface">Přehled</h2>
        </section>

        {/* Total summary */}
        <div className="bg-surface-container border-2 border-outline-variant/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest mb-1">
                Celková útrata
              </p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-mono font-black text-on-surface tabular-nums">
                  {Math.round(sessionTotal)}
                </span>
                <span className="text-primary font-bold">Kč</span>
              </div>
            </div>
            <span className="px-3 py-1 bg-surface-variant rounded-full text-zinc-400 font-mono text-[10px] uppercase tracking-widest border border-zinc-800/60">
              {sessionDrinkCount}{' '}
              {sessionDrinkCount === 1 ? 'nápoj' : sessionDrinkCount < 5 ? 'nápoje' : 'nápojů'}
            </span>
          </div>
        </div>

        {/* Per-person breakdown */}
        {users.length > 0 && (
          <section className="space-y-3">
            <h3 className="font-mono text-xs uppercase tracking-wider text-outline">
              Rozpis po osobách
            </h3>
            {users.map((user) => {
              const avatar = getAvatarClasses(user.avatar_color)
              const breakdown = userDrinkBreakdown(user.id)
              const total = userTotal(user.id)
              if (breakdown.length === 0) return null
              return (
                <div
                  key={user.id}
                  className="bg-surface-container-low border-2 border-outline-variant/20 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border-2 ${avatar.bg} ${avatar.text} ${avatar.border}`}
                        aria-hidden
                      >
                        {getInitials(user.name)}
                      </div>
                      <span className="font-bold text-on-surface text-sm">{user.name}</span>
                    </div>
                    <span className="font-mono font-bold text-primary text-sm tabular-nums">
                      {Math.round(total)} Kč
                    </span>
                  </div>
                  <div className="space-y-1 pl-11">
                    {breakdown.map(({ drink, count, subtotal }) => (
                      <div key={drink.id} className="flex justify-between items-center">
                        <span className="text-xs text-on-surface-variant">
                          {drink.name}
                          <span className="text-outline ml-1">×{count}</span>
                        </span>
                        <span className="text-xs font-mono text-outline tabular-nums">
                          {Math.round(subtotal)} Kč
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </section>
        )}

        {users.length === 0 && (
          <p className="text-on-surface-variant text-sm text-center py-8">
            Zatím nikdo u stolu.
          </p>
        )}

        {/* Close account button */}
        {!isClosed && users.length > 0 && (
          <div className="pt-2 pb-4">
            <button
              onClick={() => setShowConfirm(true)}
              className="w-full py-3.5 bg-beer-gradient text-on-primary-container font-black uppercase tracking-widest rounded-2xl shadow-xl active:translate-y-1 transition-all border-b-4 border-amber-800/40 flex items-center justify-center gap-2.5 text-sm"
            >
              <span className="material-symbols-outlined icon-filled text-base">receipt_long</span>
              Uzavřít účet
            </button>
          </div>
        )}

        {isClosed && (
          <div className="bg-surface-container border-2 border-outline-variant/20 rounded-xl p-4 text-center">
            <span className="material-symbols-outlined text-primary text-2xl icon-filled">check_circle</span>
            <p className="text-on-surface-variant text-sm mt-2">Účet byl uzavřen.</p>
          </div>
        )}
      </main>

      <BottomNav pubId={params.pubId} />

      <Modal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Uzavřít účet?"
      >
        <div className="space-y-4">
          <p className="text-on-surface-variant text-sm">
            Celková útrata:{' '}
            <span className="font-mono font-bold text-primary">
              {Math.round(sessionTotal)} Kč
            </span>
            {' '}za{' '}
            <span className="font-bold text-on-surface">{sessionDrinkCount}</span>{' '}
            {sessionDrinkCount === 1 ? 'nápoj' : sessionDrinkCount < 5 ? 'nápoje' : 'nápojů'}.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 bg-surface-variant text-on-surface-variant font-bold py-3 rounded-2xl active:scale-95 transition-transform text-sm"
            >
              Zpět
            </button>
            <button
              onClick={handleClose}
              disabled={closing}
              className="flex-1 bg-beer-gradient text-on-primary-container font-bold py-3 rounded-2xl active:translate-y-0.5 transition-all disabled:opacity-40 text-sm"
            >
              {closing ? 'Uzavírám…' : 'Uzavřít'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

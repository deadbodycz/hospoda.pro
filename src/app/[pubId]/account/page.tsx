'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Receipt, CheckCircle, Trash2 } from 'lucide-react'
import { useSession } from '@/contexts/SessionContext'
import { BottomNav } from '@/components/BottomNav'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { getAvatarStyle, getInitials } from '@/lib/colors'

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
            <ArrowLeft className="w-5 h-5 text-on-surface-variant" />
          </Link>
          <span className="text-primary font-bold tracking-tighter text-base">
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
        <div className="bg-primary rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-on-primary/60 font-mono text-[10px] uppercase tracking-widest mb-1">
                {isClosed ? 'Uzavřená útrata' : 'Celková útrata'}
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-mono font-black text-on-primary tabular-nums">
                  {Math.round(sessionTotal)}
                </span>
                <span className="text-on-primary font-bold">Kč</span>
              </div>
              <p className="text-on-primary/60 text-xs mt-0.5">
                {sessionDrinkCount}{' '}
                {sessionDrinkCount === 1 ? 'nápoj' : sessionDrinkCount < 5 ? 'nápoje' : 'nápojů'}
              </p>
            </div>
            <Receipt className="w-8 h-8 text-on-primary/20" />
          </div>
        </div>

        {/* Per-person breakdown */}
        {users.length > 0 && (
          <section className="space-y-3">
            <h3 className="font-mono text-xs uppercase tracking-wider text-outline">
              Rozpis po osobách
            </h3>
            {users.map((user) => {
              const av = getAvatarStyle(user.name)
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
                        className="w-8 h-8 rounded-lg border flex items-center justify-center font-bold text-xs flex-shrink-0"
                        style={{ backgroundColor: av.bg, color: av.color, borderColor: av.border }}
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
                      <div key={drink.id} className="flex items-center gap-2">
                        <span className="text-xs text-on-surface-variant min-w-0 flex-1 truncate">
                          {count}× {drink.name}
                        </span>
                        <span className="text-xs font-mono text-outline tabular-nums whitespace-nowrap flex-shrink-0">
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
              className="w-full py-3.5 bg-error/10 text-error border border-error/30 font-bold rounded-xl active:translate-y-0.5 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Uzavřít účet
            </button>
          </div>
        )}

        {isClosed && (
          <div className="bg-surface-container border-2 border-outline-variant/20 rounded-xl p-4 text-center">
            <CheckCircle className="w-6 h-6 text-primary mx-auto" />
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
              className="flex-1 bg-surface-variant text-on-surface-variant font-bold py-3 rounded-xl active:scale-95 transition-transform text-sm"
            >
              Zpět
            </button>
            <button
              onClick={handleClose}
              disabled={closing}
              className="flex-1 bg-primary text-on-primary font-bold py-3 rounded-xl active:translate-y-0.5 transition-all disabled:opacity-40 text-sm"
            >
              {closing ? 'Uzavírám…' : 'Uzavřít'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

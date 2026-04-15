'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Pencil, Trash2, ScanLine, Save, Eraser } from 'lucide-react'
import { useSession } from '@/contexts/SessionContext'
import { BottomNav } from '@/components/BottomNav'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import type { Drink } from '@/types'

export default function SettingsPage({
  params,
}: {
  params: { pubId: string }
}) {
  const { pub, drinks, loading, updatePub, updateDrink, removeDrink, clearAllDrinks } = useSession()
  const { toast } = useToast()

  // Pub editing
  const [editingPub, setEditingPub] = useState(false)
  const [pubName, setPubName] = useState('')
  const [pubAddress, setPubAddress] = useState('')
  const [savingPub, setSavingPub] = useState(false)

  function openPubEdit() {
    setPubName(pub?.name ?? '')
    setPubAddress(pub?.address ?? '')
    setEditingPub(true)
  }

  async function handleSavePub() {
    if (!pubName.trim()) return
    setSavingPub(true)
    await updatePub(pubName.trim(), pubAddress.trim() || null)
    setSavingPub(false)
    setEditingPub(false)
    toast('Hospoda byla uložena.', 'success')
  }

  // Drink editing
  const [editingDrink, setEditingDrink] = useState<Drink | null>(null)
  const [drinkName, setDrinkName] = useState('')
  const [drinkPriceSmall, setDrinkPriceSmall] = useState('')
  const [drinkPriceLarge, setDrinkPriceLarge] = useState('')
  const [savingDrink, setSavingDrink] = useState(false)

  // Drink delete confirm
  const [deletingDrink, setDeletingDrink] = useState<Drink | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  // Clear all drinks
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false)
  const [clearingAll, setClearingAll] = useState(false)

  async function handleClearAll() {
    setClearingAll(true)
    await clearAllDrinks()
    setClearingAll(false)
    setShowClearAllConfirm(false)
    toast('Ceník byl smazán.', 'info')
  }

  function openDrinkEdit(drink: Drink) {
    setDrinkName(drink.name)
    setDrinkPriceSmall(drink.price_small != null ? String(drink.price_small) : '')
    setDrinkPriceLarge(drink.price_large != null ? String(drink.price_large) : '')
    setEditingDrink(drink)
  }

  async function handleSaveDrink() {
    if (!editingDrink || !drinkName.trim()) return
    setSavingDrink(true)
    const priceSmall = drinkPriceSmall ? parseFloat(drinkPriceSmall) : null
    const priceLarge = drinkPriceLarge ? parseFloat(drinkPriceLarge) : null
    await updateDrink(editingDrink.id, drinkName.trim(), priceSmall, priceLarge)
    setSavingDrink(false)
    setEditingDrink(null)
    toast('Nápoj byl upraven.', 'success')
  }

  async function handleDeleteDrink() {
    if (!deletingDrink) return
    setConfirmingDelete(true)
    await removeDrink(deletingDrink.id)
    setConfirmingDelete(false)
    setDeletingDrink(null)
    toast('Nápoj byl odstraněn.', 'info')
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-background pb-24">
        <header className="fixed top-0 w-full h-12 z-50 bg-zinc-950/60 backdrop-blur-md border-b-2 border-zinc-800/20 flex items-center px-4">
          <div className="w-32 h-4 bg-surface-container-high rounded-full animate-pulse" />
        </header>
        <main className="pt-16 px-4 max-w-md mx-auto space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="bg-surface-container-low rounded-xl h-16 animate-pulse" />
          ))}
        </main>
        <BottomNav pubId={params.pubId} />
      </div>
    )
  }

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
        className="pt-12 px-4 max-w-md mx-auto space-y-5"
        style={{ paddingTop: 'calc(3rem + env(safe-area-inset-top))' }}
      >
        {/* Title */}
        <section className="space-y-1 pt-4">
          <p className="font-mono text-primary uppercase tracking-widest text-[10px]">
            Správa
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-on-surface">Nastavení</h2>
        </section>

        {/* Pub section */}
        <section className="space-y-2">
          <h3 className="font-mono text-xs uppercase tracking-wider text-outline">Hospoda</h3>
          <div className="bg-surface-container-low border-2 border-outline-variant/20 rounded-xl p-4 flex items-center justify-between">
            <div className="min-w-0">
              <p className="font-bold text-on-surface text-sm truncate">{pub?.name}</p>
              {pub?.address && (
                <p className="text-xs text-on-surface-variant truncate">{pub.address}</p>
              )}
            </div>
            <button
              onClick={openPubEdit}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors active:scale-90 text-outline ml-3 flex-shrink-0"
              aria-label="Upravit hospodu"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* Drinks section */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-mono text-xs uppercase tracking-wider text-outline">Ceník</h3>
            <div className="flex items-center gap-3">
              {drinks.length > 0 && (
                <button
                  onClick={() => setShowClearAllConfirm(true)}
                  className="flex items-center gap-1.5 text-error text-xs font-bold"
                >
                  <Eraser className="w-4 h-4" />
                  Smazat vše
                </button>
              )}
              <Link
                href={`/${params.pubId}/scan`}
                className="flex items-center gap-1.5 text-primary text-xs font-bold"
              >
                <ScanLine className="w-4 h-4" />
                Přeskenovat
              </Link>
            </div>
          </div>

          {drinks.length === 0 ? (
            <p className="text-on-surface-variant text-sm text-center py-6">
              Žádné nápoje. Naskenuj ceník!
            </p>
          ) : (
            <div className="bg-surface-container border-2 border-outline-variant/20 rounded-xl overflow-hidden">
              {drinks.map((drink, idx) => {
                const price = drink.price_large ?? drink.price_small
                const isLast = idx === drinks.length - 1
                return (
                  <div
                    key={drink.id}
                    className={`flex items-center justify-between px-4 py-3 ${!isLast ? 'border-b border-outline-variant/15' : ''}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-on-surface truncate">{drink.name}</p>
                      {price != null && (
                        <p className="text-xs font-mono text-outline">{Math.round(price)} Kč</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                      <button
                        onClick={() => openDrinkEdit(drink)}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors active:scale-90 text-outline"
                        aria-label={`Upravit ${drink.name}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingDrink(drink)}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-error/10 transition-colors active:scale-90 text-outline hover:text-error"
                        aria-label={`Smazat ${drink.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>

      <BottomNav pubId={params.pubId} />

      {/* Edit pub modal */}
      <Modal
        open={editingPub}
        onClose={() => setEditingPub(false)}
        title="Upravit hospodu"
      >
        <div className="space-y-4">
          <div>
            <label className="font-mono text-[10px] uppercase text-outline mb-2 block tracking-widest">
              Název hospody *
            </label>
            <input
              autoFocus
              value={pubName}
              onChange={(e) => setPubName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSavePub()}
              placeholder="např. U Zlatého kohouta"
              className="w-full bg-surface-container-low border-2 border-outline-variant rounded-xl p-3 focus:border-primary focus:outline-none text-on-surface text-sm"
            />
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase text-outline mb-2 block tracking-widest">
              Adresa (nepovinné)
            </label>
            <input
              value={pubAddress}
              onChange={(e) => setPubAddress(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSavePub()}
              placeholder="např. Vinohradská 102, Praha"
              className="w-full bg-surface-container-low border-2 border-outline-variant rounded-xl p-3 focus:border-primary focus:outline-none text-on-surface text-sm"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setEditingPub(false)}
              className="flex-1 bg-surface-variant text-on-surface-variant font-bold py-2.5 rounded-xl active:scale-95 transition-transform text-sm"
            >
              Zrušit
            </button>
            <button
              onClick={handleSavePub}
              disabled={!pubName.trim() || savingPub}
              className="flex-1 bg-primary text-on-primary font-bold py-2.5 rounded-xl active:translate-y-0.5 transition-all disabled:opacity-40 text-sm flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              {savingPub ? 'Ukládám…' : 'Uložit'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit drink modal */}
      <Modal
        open={editingDrink !== null}
        onClose={() => setEditingDrink(null)}
        title="Upravit nápoj"
      >
        <div className="space-y-4">
          <div>
            <label className="font-mono text-[10px] uppercase text-outline mb-2 block tracking-widest">
              Název *
            </label>
            <input
              autoFocus
              value={drinkName}
              onChange={(e) => setDrinkName(e.target.value)}
              placeholder="např. Pilsner Urquell 0,5l"
              className="w-full bg-surface-container-low border-2 border-outline-variant rounded-xl p-3 focus:border-primary focus:outline-none text-on-surface text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-[10px] uppercase text-outline mb-2 block tracking-widest">
                Cena malá (Kč)
              </label>
              <input
                type="number"
                inputMode="decimal"
                value={drinkPriceSmall}
                onChange={(e) => setDrinkPriceSmall(e.target.value)}
                placeholder="38"
                className="w-full bg-surface-container-low border-2 border-outline-variant rounded-xl p-3 focus:border-primary focus:outline-none text-on-surface text-sm"
              />
            </div>
            <div>
              <label className="font-mono text-[10px] uppercase text-outline mb-2 block tracking-widest">
                Cena velká (Kč)
              </label>
              <input
                type="number"
                inputMode="decimal"
                value={drinkPriceLarge}
                onChange={(e) => setDrinkPriceLarge(e.target.value)}
                placeholder="52"
                className="w-full bg-surface-container-low border-2 border-outline-variant rounded-xl p-3 focus:border-primary focus:outline-none text-on-surface text-sm"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setEditingDrink(null)}
              className="flex-1 bg-surface-variant text-on-surface-variant font-bold py-2.5 rounded-xl active:scale-95 transition-transform text-sm"
            >
              Zrušit
            </button>
            <button
              onClick={handleSaveDrink}
              disabled={!drinkName.trim() || savingDrink}
              className="flex-1 bg-primary text-on-primary font-bold py-2.5 rounded-xl active:translate-y-0.5 transition-all disabled:opacity-40 text-sm flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              {savingDrink ? 'Ukládám…' : 'Uložit'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete drink confirm */}
      <Modal
        open={deletingDrink !== null}
        onClose={() => setDeletingDrink(null)}
        title="Smazat nápoj?"
      >
        <div className="space-y-4">
          <p className="text-on-surface-variant text-sm">
            Opravdu chceš smazat{' '}
            <span className="font-bold text-on-surface">{deletingDrink?.name}</span>?
            Tato akce je nevratná.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setDeletingDrink(null)}
              className="flex-1 bg-surface-variant text-on-surface-variant font-bold py-2.5 rounded-xl active:scale-95 transition-transform text-sm"
            >
              Zrušit
            </button>
            <button
              onClick={handleDeleteDrink}
              disabled={confirmingDelete}
              className="flex-1 bg-error-container text-error font-bold py-2.5 rounded-xl active:scale-95 transition-all disabled:opacity-40 text-sm"
            >
              {confirmingDelete ? 'Mažu…' : 'Smazat'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Clear all drinks confirm */}
      <Modal
        open={showClearAllConfirm}
        onClose={() => setShowClearAllConfirm(false)}
        title="Smazat celý ceník?"
      >
        <div className="space-y-4">
          <p className="text-on-surface-variant text-sm">
            Opravdu chceš smazat všechny{' '}
            <span className="font-bold text-on-surface">{drinks.length} nápoje</span>?
            Tato akce je nevratná. Ceník pak můžeš znovu naskenovat.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowClearAllConfirm(false)}
              className="flex-1 bg-surface-variant text-on-surface-variant font-bold py-2.5 rounded-xl active:scale-95 transition-transform text-sm"
            >
              Zrušit
            </button>
            <button
              onClick={handleClearAll}
              disabled={clearingAll}
              className="flex-1 bg-error-container text-error font-bold py-2.5 rounded-xl active:scale-95 transition-all disabled:opacity-40 text-sm"
            >
              {clearingAll ? 'Mažu…' : 'Smazat vše'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

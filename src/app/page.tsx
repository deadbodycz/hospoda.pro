'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, MapPin, Plus, Pencil, Trash2, Navigation2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Modal } from '@/components/ui/Modal'
import { PubFinderModal } from '@/components/PubFinderModal'
import type { OsmPub } from '@/types'
import { BottomNav } from '@/components/BottomNav'
import { useToast } from '@/components/ui/Toast'
import type { Pub } from '@/types'
import { useSubscription } from '@/contexts/SubscriptionContext'

export default function OnboardingPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { isPro, loading: authLoading } = useSubscription()
  const [localPubName, setLocalPubName] = useState('')

  const [pubs, setPubs] = useState<Pub[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [showNewPubModal, setShowNewPubModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const [creating, setCreating] = useState(false)

  // Edit pub
  const [editingPub, setEditingPub] = useState<Pub | null>(null)
  const [editName, setEditName] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [saving, setSaving] = useState(false)

  // Delete pub
  const [deletingPub, setDeletingPub] = useState<Pub | null>(null)
  const [confirmingDeletePub, setConfirmingDeletePub] = useState(false)

  // Pub finder
  const [showPubFinderModal, setShowPubFinderModal] = useState(false)

  useEffect(() => {
    if (!isPro) return
    loadPubs()

    // Re-fetch při návratu na stránku (bfcache + Next.js router cache)
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadPubs()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [isPro])

  async function loadPubs() {
    setLoading(true)
    const { data } = await supabase
      .from('pubs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    setPubs(data ?? [])
    setLoading(false)
  }

  const filtered = pubs.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      (p.address ?? '').toLowerCase().includes(query.toLowerCase())
  )

  function openEditPub(pub: Pub, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setEditName(pub.name)
    setEditAddress(pub.address ?? '')
    setEditingPub(pub)
  }

  async function savePub() {
    if (!editingPub || !editName.trim()) return
    setSaving(true)
    const { error } = await supabase
      .from('pubs')
      .update({ name: editName.trim(), address: editAddress.trim() || null })
      .eq('id', editingPub.id)
    setSaving(false)
    if (error) {
      toast('Nepodařilo se uložit hospodu. Zkus to znovu.', 'error')
      return
    }
    setPubs((prev) =>
      prev.map((p) =>
        p.id === editingPub.id
          ? { ...p, name: editName.trim(), address: editAddress.trim() || null }
          : p
      )
    )
    setEditingPub(null)
    toast('Hospoda byla uložena.', 'success')
  }

  async function handleDeletePub() {
    if (!deletingPub) return
    setConfirmingDeletePub(true)
    // Smazat foto ceníku ze Storage (tiché selhání — soubor nemusí existovat)
    await supabase.storage.from('menu-photos').remove([`${deletingPub.id}.jpg`]).catch(() => {})
    const { error } = await supabase.from('pubs').delete().eq('id', deletingPub.id)
    setConfirmingDeletePub(false)
    if (error) {
      toast(`Nepodařilo se smazat hospodu: ${error.message}`, 'error')
      return
    }
    setDeletingPub(null)
    toast('Hospoda byla smazána.', 'info')
    await loadPubs()   // re-fetch z DB, ignoruje Next.js router cache
    router.refresh()   // invaliduje server cache pro future navigace
  }

  function handlePubFinderSelect(pub: OsmPub) {
    setShowPubFinderModal(false)
    setNewName(pub.name)
    setNewAddress(pub.address ?? '')
    setShowNewPubModal(true)
  }

  async function createPub() {
    if (!newName.trim()) return
    setCreating(true)
    const { data, error } = await supabase
      .from('pubs')
      .insert({ name: newName.trim(), address: newAddress.trim() || null })
      .select()
      .single()
    setCreating(false)
    if (error || !data) {
      toast('Nepodařilo se vytvořit hospodu. Zkus to znovu.', 'error')
      return
    }
    setShowNewPubModal(false)
    setNewName('')
    setNewAddress('')
    router.push(`/${data.id}`)
  }

  function handleStartFree() {
    const trimmed = localPubName.trim()
    if (!trimmed) return
    const pubId = crypto.randomUUID()
    const pub = {
      id: pubId,
      name: trimmed,
      address: null,
      menu_photo_url: null,
      created_at: new Date().toISOString(),
    }
    localStorage.setItem('hospoda_pub', JSON.stringify(pub))
    localStorage.removeItem('hospoda_session')
    localStorage.removeItem('hospoda_users')
    localStorage.removeItem('hospoda_logs')
    localStorage.removeItem('hospoda_drinks')
    router.push(`/${pubId}`)
  }

  return (
    <div className="min-h-[100dvh] bg-background text-on-background pb-24">
      {/* Header */}
      <header className="fixed top-0 w-full h-12 z-50 bg-zinc-950/60 backdrop-blur-md border-b-2 border-zinc-800/20 flex justify-between items-center px-6">
        <div className="flex items-center gap-2">
          <h1 className="text-[#a8bc00] font-bold tracking-tighter text-xl">hospoda.pro</h1>
        </div>
        <ThemeToggle />
      </header>

      <main
        className="pt-20 px-6 max-w-2xl mx-auto space-y-10"
        style={{ paddingTop: 'calc(3rem + env(safe-area-inset-top) + 2rem)' }}
      >
        {authLoading ? (
          /* Auth loading skeleton */
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-surface-container rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : !isPro ? (
          /* Free user flow */
          <div className="space-y-4">
            <div className="bg-surface-container rounded-2xl p-4 space-y-3">
              <p className="text-sm text-on-surface-variant">
                Zadej název hospody a začni počítat. Data se ukládají jen lokálně na toto zařízení.
              </p>
              <input
                type="text"
                placeholder="Název hospody…"
                value={localPubName}
                onChange={(e) => setLocalPubName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStartFree()}
                className="w-full bg-background border border-outline-variant rounded-xl px-4 py-3 text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary"
              />
              <button
                onClick={handleStartFree}
                disabled={!localPubName.trim()}
                className="w-full bg-primary text-on-primary rounded-xl py-3 font-medium disabled:opacity-40 active:scale-95 transition-transform"
              >
                Začít počítat
              </button>
            </div>
            <div className="text-center">
              <p className="text-xs text-on-surface-variant mb-2">Chceš ukládání do cloudu, historii a AI skenování?</p>
              <Link
                href="/pricing"
                className="text-primary text-sm font-medium underline underline-offset-2"
              >
                Vyzkoušet PRO
              </Link>
            </div>
          </div>
        ) : (
          /* Pro user flow — původní obsah */
          <>
            {/* Search */}
            <div className="relative">
              <label className="block font-mono text-xs uppercase tracking-widest text-outline mb-2 ml-1">
                Najdi svou hospodu
              </label>
              <div className="flex items-center gap-3 bg-surface border border-outline-variant rounded-xl px-4 py-3 mx-0">
                <Search className="w-4 h-4 text-outline flex-shrink-0" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Hledej…"
                  className="flex-1 bg-transparent text-on-surface focus:outline-none placeholder:text-outline/50 text-base"
                />
              </div>
            </div>

            {/* Pub finder button */}
            <button
              onClick={() => setShowPubFinderModal(true)}
              className="w-full flex items-center gap-3 bg-surface border border-outline-variant rounded-xl px-4 py-3 active:scale-[0.99] transition-transform text-left -mt-6"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/12 border border-primary/25 flex items-center justify-center flex-shrink-0">
                <Navigation2 className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-on-surface text-sm">Najít hospody v okolí</p>
                <p className="text-xs text-outline mt-0.5">MapLibre + MapTiler / OpenStreetMap</p>
              </div>
            </button>

            {/* Pub list */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-xl tracking-tight text-on-surface">
                  {query ? 'Výsledky' : 'Nedávné hospody'}
                </h2>
                <span className="font-mono text-xs text-outline uppercase tracking-tighter">
                  {filtered.length} hospod
                </span>
              </div>

              {loading ? (
                <div className="space-y-4">
                  {[0, 1].map((i) => (
                    <div
                      key={i}
                      className="bg-surface-container-low rounded-3xl p-6 border-2 border-transparent animate-pulse h-28"
                    />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <EmptyState onAdd={() => setShowNewPubModal(true)} />
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {filtered.map((pub) => (
                    <PubCard
                      key={pub.id}
                      pub={pub}
                      onEdit={(e) => openEditPub(pub, e)}
                      onDelete={(e) => { e.preventDefault(); e.stopPropagation(); setDeletingPub(pub) }}
                    />
                  ))}
                </div>
              )}
            </section>

            <div className="pt-12 flex justify-center">
              <div className="w-24 h-1 bg-gradient-to-r from-transparent via-primary-container to-transparent opacity-20 rounded-full" />
            </div>
          </>
        )}
      </main>

      {/* FAB — pouze pro Pro uživatele */}
      {isPro && !authLoading && (
        <button
          onClick={() => setShowNewPubModal(true)}
          className="fixed bottom-6 right-4 flex items-center gap-2 bg-primary text-on-primary font-bold px-5 py-3 rounded-xl accent-shadow active:translate-y-0.5 transition-all text-sm z-40"
          style={{ bottom: 'max(env(safe-area-inset-bottom) + 16px, 24px)' }}
          aria-label="Přidat novou hospodu"
        >
          <Plus className="w-4 h-4" />
          Přidat hospodu
        </button>
      )}

      <BottomNav />

      {/* Edit pub modal */}
      <Modal
        open={editingPub !== null}
        onClose={() => setEditingPub(null)}
        title="Upravit hospodu"
      >
        <div className="space-y-4">
          <div>
            <label className="font-mono text-[10px] uppercase text-outline mb-2 block tracking-widest">
              Název hospody *
            </label>
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && savePub()}
              placeholder="např. U Zlatého kohouta"
              className="w-full bg-surface-container-low border-2 border-outline-variant rounded-xl p-3 focus:border-primary focus:outline-none text-on-surface text-sm"
            />
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase text-outline mb-2 block tracking-widest">
              Adresa (nepovinné)
            </label>
            <input
              value={editAddress}
              onChange={(e) => setEditAddress(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && savePub()}
              placeholder="např. Vinohradská 102, Praha"
              className="w-full bg-surface-container-low border-2 border-outline-variant rounded-xl p-3 focus:border-primary focus:outline-none text-on-surface text-sm"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setEditingPub(null)}
              className="flex-1 bg-surface-variant text-on-surface-variant font-bold py-2.5 rounded-xl active:scale-95 transition-transform text-sm"
            >
              Zrušit
            </button>
            <button
              onClick={savePub}
              disabled={!editName.trim() || saving}
              className="flex-1 bg-primary text-on-primary font-bold py-2.5 rounded-xl active:translate-y-0.5 transition-all disabled:opacity-40 text-sm"
            >
              {saving ? 'Ukládám…' : 'Uložit'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete pub confirm */}
      <Modal
        open={deletingPub !== null}
        onClose={() => setDeletingPub(null)}
        title="Smazat hospodu?"
      >
        <div className="space-y-4">
          <p className="text-on-surface-variant text-sm">
            Opravdu chceš smazat{' '}
            <span className="font-bold text-on-surface">{deletingPub?.name}</span>?
            Smaže se i ceník a všechny záznamy pití. Tato akce je nevratná.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setDeletingPub(null)}
              className="flex-1 bg-surface-variant text-on-surface-variant font-bold py-2.5 rounded-xl active:scale-95 transition-transform text-sm"
            >
              Zrušit
            </button>
            <button
              onClick={handleDeletePub}
              disabled={confirmingDeletePub}
              className="flex-1 bg-error-container text-error font-bold py-2.5 rounded-xl active:scale-95 transition-all disabled:opacity-40 text-sm"
            >
              {confirmingDeletePub ? 'Mažu…' : 'Smazat'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Pub finder modal */}
      {showPubFinderModal && (
        <PubFinderModal
          open={showPubFinderModal}
          onClose={() => setShowPubFinderModal(false)}
          onSelect={handlePubFinderSelect}
        />
      )}

      {/* New pub modal */}
      <Modal
        open={showNewPubModal}
        onClose={() => setShowNewPubModal(false)}
        title="Nová hospoda"
      >
        <div className="space-y-5">
          <div>
            <label className="font-mono text-[10px] uppercase text-outline mb-2 block tracking-widest">
              Název hospody *
            </label>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createPub()}
              placeholder="např. U Zlatého kohouta"
              className="w-full bg-surface-container-low border-2 border-outline-variant rounded-xl p-4 focus:border-primary focus:outline-none text-on-surface"
            />
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase text-outline mb-2 block tracking-widest">
              Adresa (nepovinné)
            </label>
            <input
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createPub()}
              placeholder="např. Vinohradská 102, Praha"
              className="w-full bg-surface-container-low border-2 border-outline-variant rounded-xl p-4 focus:border-primary focus:outline-none text-on-surface"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowNewPubModal(false)}
              className="flex-1 bg-surface-variant text-on-surface-variant font-bold py-3 rounded-xl active:scale-95 transition-transform"
            >
              Zrušit
            </button>
            <button
              onClick={createPub}
              disabled={!newName.trim() || creating}
              className="flex-1 bg-primary text-on-primary font-bold py-3 rounded-xl active:translate-y-0.5 transition-all disabled:opacity-40"
            >
              {creating ? 'Vytvářím…' : 'Vytvořit'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function PubCard({
  pub,
  onEdit,
  onDelete,
}: {
  pub: Pub
  onEdit: (e: React.MouseEvent) => void
  onDelete: (e: React.MouseEvent) => void
}) {
  return (
    <div className="relative">
      <Link
        href={`/${pub.id}`}
        className="flex items-center gap-3 bg-surface border border-outline-variant rounded-xl px-4 py-3 pr-20 active:scale-[0.99] transition-transform"
      >
        <div className="w-8 h-8 rounded-lg bg-primary/12 border border-primary/25 flex items-center justify-center flex-shrink-0">
          <MapPin className="w-4 h-4 text-[#a8bc00]" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-on-surface text-sm leading-snug">{pub.name}</p>
          {pub.address && <p className="text-xs text-outline mt-0.5">{pub.address}</p>}
        </div>
      </Link>
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
        <button
          onClick={onEdit}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container-high transition-colors active:scale-90 text-outline"
          aria-label={`Upravit ${pub.name}`}
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-error/10 transition-colors active:scale-90 text-outline hover:text-error"
          aria-label={`Smazat ${pub.name}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
      <div className="relative w-32 h-32 flex items-center justify-center">
        <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl" />
        <div className="relative w-24 h-24 bg-surface-container-highest border-2 border-outline-variant rounded-xl flex items-center justify-center">
          <MapPin className="w-10 h-10 text-outline-variant" />
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="font-bold text-xl text-on-surface">Žádné hospody</h3>
        <p className="text-on-surface-variant text-sm max-w-[240px] mx-auto">
          Ještě jsi nepřidal žádnou hospodu. Začni tím, že přidáš svou první.
        </p>
      </div>
      <button
        onClick={onAdd}
        className="bg-primary text-on-primary px-8 py-3 rounded-xl font-bold active:scale-95 transition-all shadow-lg"
      >
        Přidat první hospodu
      </button>
    </div>
  )
}

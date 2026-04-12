'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Modal } from '@/components/ui/Modal'
import { BottomNav } from '@/components/BottomNav'
import { useToast } from '@/components/ui/Toast'
import type { Pub } from '@/types'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'Dnes'
  if (days === 1) return 'Včera'
  if (days < 7) return `Před ${days} dny`
  const weeks = Math.floor(days / 7)
  if (weeks === 1) return 'Minulý týden'
  return `Před ${weeks} týdny`
}

export default function OnboardingPage() {
  const router = useRouter()
  const { toast } = useToast()

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

  useEffect(() => {
    loadPubs()
  }, [])

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

  return (
    <div className="min-h-[100dvh] bg-background text-on-background pb-24">
      {/* Header */}
      <header className="fixed top-0 w-full h-12 z-50 bg-zinc-950/60 backdrop-blur-md border-b-2 border-zinc-800/20 flex justify-between items-center px-6">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-500 icon-filled">local_bar</span>
          <h1 className="text-amber-500 font-bold tracking-tighter text-xl">hospoda.pro</h1>
        </div>
        <ThemeToggle />
      </header>

      <main
        className="pt-20 px-6 max-w-2xl mx-auto space-y-10"
        style={{ paddingTop: 'calc(3rem + env(safe-area-inset-top) + 2rem)' }}
      >
        {/* Search */}
        <div className="relative">
          <label className="block font-mono text-xs uppercase tracking-widest text-outline mb-2 ml-1">
            Najdi svou hospodu
          </label>
          <div className="relative">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Hledej hospody nebo města…"
              className="w-full bg-surface-container-low border-2 border-outline-variant rounded-2xl py-3 px-5 pl-12 text-on-surface focus:border-primary focus:outline-none transition-all placeholder:text-outline/50 text-base"
            />
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary text-xl">
              search
            </span>
          </div>
        </div>

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
                <PubCard key={pub.id} pub={pub} onEdit={(e) => openEditPub(pub, e)} />
              ))}
            </div>
          )}
        </section>

        <div className="pt-12 flex justify-center">
          <div className="w-24 h-1 bg-gradient-to-r from-transparent via-primary-container to-transparent opacity-20 rounded-full" />
        </div>
      </main>

      {/* FAB */}
      <button
        onClick={() => setShowNewPubModal(true)}
        className="fixed bottom-24 right-6 w-16 h-16 bg-primary text-on-primary-container rounded-2xl flex items-center justify-center shadow-[0_24px_24px_-12px_rgba(232,160,32,0.3)] border-2 border-on-primary-container hover:-translate-y-1 active:translate-y-0 transition-all z-40"
        aria-label="Přidat novou hospodu"
      >
        <span className="material-symbols-outlined text-3xl font-bold">add</span>
      </button>

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
              className="flex-1 bg-surface-variant text-on-surface-variant font-bold py-2.5 rounded-2xl active:scale-95 transition-transform text-sm"
            >
              Zrušit
            </button>
            <button
              onClick={savePub}
              disabled={!editName.trim() || saving}
              className="flex-1 bg-beer-gradient text-on-primary-container font-bold py-2.5 rounded-2xl active:translate-y-0.5 transition-all disabled:opacity-40 text-sm"
            >
              {saving ? 'Ukládám…' : 'Uložit'}
            </button>
          </div>
        </div>
      </Modal>

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
              className="flex-1 bg-surface-variant text-on-surface-variant font-bold py-3 rounded-2xl active:scale-95 transition-transform"
            >
              Zrušit
            </button>
            <button
              onClick={createPub}
              disabled={!newName.trim() || creating}
              className="flex-1 bg-beer-gradient text-on-primary-container font-bold py-3 rounded-2xl active:translate-y-0.5 transition-all disabled:opacity-40"
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
}: {
  pub: Pub
  onEdit: (e: React.MouseEvent) => void
}) {
  return (
    <Link
      href={`/${pub.id}`}
      className="group bg-surface-container-low rounded-3xl p-4 border-2 border-transparent hover:border-outline-variant transition-all cursor-pointer relative overflow-hidden block"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />
      <div className="flex justify-between items-start relative z-10">
        <div className="space-y-0.5">
          <h3 className="font-bold text-base text-primary">{pub.name}</h3>
          {pub.address && (
            <p className="text-on-surface-variant text-xs font-medium">{pub.address}</p>
          )}
        </div>
        <button
          onClick={onEdit}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors active:scale-90 text-outline flex-shrink-0 ml-2"
          aria-label={`Upravit ${pub.name}`}
        >
          <span className="material-symbols-outlined text-lg">edit</span>
        </button>
      </div>
      <div className="mt-3 flex items-center justify-between text-outline">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm">calendar_today</span>
          <span className="text-xs uppercase font-mono tracking-widest">{timeAgo(pub.created_at)}</span>
        </div>
        <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">
          arrow_forward
        </span>
      </div>
    </Link>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
      <div className="relative w-32 h-32 flex items-center justify-center">
        <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl" />
        <div className="relative w-24 h-24 bg-surface-container-highest border-2 border-outline-variant rounded-xl flex items-center justify-center">
          <span className="material-symbols-outlined text-5xl text-outline-variant">sports_bar</span>
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
        className="bg-primary text-on-primary-container px-8 py-3 rounded-2xl font-bold border-2 border-on-primary-container active:scale-95 transition-all shadow-lg"
      >
        Přidat první hospodu
      </button>
    </div>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, UserPlus, Pencil, Trash2, Check, X } from 'lucide-react'
import { useSession } from '@/contexts/SessionContext'
import { BottomNav } from '@/components/BottomNav'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { getAvatarStyle, getInitials } from '@/lib/colors'

const SUGGESTED_NAMES = [
  'Honza', 'Petra', 'Martin', 'Katka', 'Tomáš',
  'Lucie', 'Jakub', 'Tereza', 'Ondřej', 'Anička',
]

export default function UsersPage({
  params,
}: {
  params: { pubId: string }
}) {
  const { pub, users, loading, addUser, removeUser, updateUser } = useSession()
  const { toast } = useToast()

  const [showAddModal, setShowAddModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  // Edit user
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editUserName, setEditUserName] = useState('')
  const [savingUser, setSavingUser] = useState(false)

  function openEditUser(id: string, name: string) {
    setEditUserName(name)
    setEditingUserId(id)
  }

  async function handleSaveUser() {
    if (!editingUserId || !editUserName.trim()) return
    setSavingUser(true)
    await updateUser(editingUserId, editUserName.trim())
    setSavingUser(false)
    setEditingUserId(null)
    toast(`Jméno bylo změněno na ${editUserName.trim()}.`, 'success')
  }

  const suggestedFiltered = SUGGESTED_NAMES.filter(
    (n) => !users.some((u) => u.name.toLowerCase() === n.toLowerCase())
  )

  async function handleAddUser(name: string) {
    if (!name.trim()) return
    setAdding(true)
    await addUser(name.trim())
    setAdding(false)
    setNewName('')
    setShowAddModal(false)
    toast(`${name.trim()} přidán(a) ke stolu.`, 'success')
  }

  async function handleRemove(id: string, name: string) {
    setRemoving(id)
    await removeUser(id)
    setRemoving(null)
    toast(`${name} odebrán(a) ze stolu.`, 'info')
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-background pb-24">
        <header className="fixed top-0 w-full h-12 z-50 bg-zinc-950/60 backdrop-blur-md border-b-2 border-zinc-800/20 flex justify-between items-center px-6">
          <div className="w-32 h-4 bg-surface-container-high rounded-full animate-pulse" />
        </header>
        <main className="pt-20 px-6 max-w-2xl mx-auto space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-surface-container-low rounded-3xl h-20 animate-pulse" />
          ))}
        </main>
        <BottomNav pubId={params.pubId} />
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-background text-on-background pb-24">
      {/* Header */}
      <header className="fixed top-0 w-full h-12 z-50 bg-zinc-950/60 backdrop-blur-md border-b-2 border-zinc-800/20 flex justify-between items-center px-6">
        <div className="flex items-center gap-2">
          <Link
            href={`/${params.pubId}`}
            className="w-9 h-9 flex items-center justify-center hover:bg-zinc-800/50 rounded-full transition-colors active:scale-95"
            aria-label="Zpět"
          >
            <ArrowLeft className="w-5 h-5 text-on-surface-variant" />
          </Link>
          <span className="text-primary font-bold tracking-tighter text-xl">
            {pub?.name ?? 'Hospoda'}
          </span>
        </div>
        <ThemeToggle />
      </header>

      <main className="pt-16 px-6 max-w-2xl mx-auto space-y-8">
        {/* Section header */}
        <section className="space-y-2 mt-4">
          <p className="font-mono text-primary uppercase tracking-widest text-[10px]">
            Aktuální session
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-on-surface">
            Stůl
          </h2>
          <p className="text-on-surface-variant text-sm">
            Přidej kamarády ke stolu a sleduj jejich nápoje.
          </p>
        </section>

        {/* Suggested names */}
        {suggestedFiltered.length > 0 && (
          <section className="space-y-4">
            <h3 className="font-mono text-xs uppercase tracking-wider text-outline">
              Rychlé přidání
            </h3>
            <div className="flex overflow-x-auto gap-4 pb-2">
              {suggestedFiltered.slice(0, 8).map((name) => {
                const av = getAvatarStyle(name)
                return (
                  <button
                    key={name}
                    onClick={() => handleAddUser(name)}
                    className="flex-none flex flex-col items-center gap-2 active:scale-90 transition-transform"
                    aria-label={`Přidat ${name}`}
                  >
                    <div
                      className="w-14 h-14 rounded-full border-2 flex items-center justify-center font-bold text-sm"
                      style={{ backgroundColor: av.bg, color: av.color, borderColor: av.border }}
                    >
                      {getInitials(name)}
                    </div>
                    <span className="text-[10px] font-mono" style={{ color: av.color }}>{name}</span>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {/* Add button */}
        <section>
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full bg-primary text-on-primary font-bold py-3 rounded-xl active:translate-y-0.5 transition-all flex items-center justify-center gap-2 text-sm"
          >
            <UserPlus className="w-4 h-4" />
            Přidat osobu
          </button>
        </section>

        {/* Active users */}
        <section className="space-y-6 pb-8">
          <div className="flex justify-between items-end">
            <h3 className="text-xl font-bold text-on-surface">U stolu</h3>
            <span className="font-mono text-primary text-sm">
              {users.length} {users.length === 1 ? 'osoba' : users.length < 5 ? 'osoby' : 'osob'}
            </span>
          </div>

          {users.length === 0 ? (
            <p className="text-on-surface-variant text-sm text-center py-8">
              Ještě nikdo u stolu. Přidej kamarády výše!
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {users.map((user) => {
                const av = getAvatarStyle(user.name)
                return (
                  <div
                    key={user.id}
                    className="bg-surface-container-low border-2 border-outline-variant/20 p-4 rounded-3xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-10 h-10 rounded-lg border flex items-center justify-center font-bold text-sm flex-shrink-0"
                        style={{ backgroundColor: av.bg, color: av.color, borderColor: av.border }}
                      >
                        {getInitials(user.name)}
                      </div>
                      <div>
                        <p className="font-bold text-on-surface">{user.name}</p>
                        <p className="text-xs font-mono text-outline uppercase tracking-wider">
                          Host
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditUser(user.id, user.name)}
                        aria-label={`Upravit ${user.name}`}
                        className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors active:scale-90 text-outline"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleRemove(user.id, user.name)}
                        disabled={removing === user.id}
                        aria-label={`Odebrat ${user.name}`}
                        className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors active:scale-90 text-outline disabled:opacity-30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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

      {/* Edit user modal */}
      <Modal
        open={editingUserId !== null}
        onClose={() => setEditingUserId(null)}
        title="Upravit jméno"
      >
        <div className="space-y-4">
          <div>
            <label className="font-mono text-[10px] uppercase text-outline mb-2 block tracking-widest">
              Jméno
            </label>
            <input
              autoFocus
              value={editUserName}
              onChange={(e) => setEditUserName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveUser()}
              placeholder="např. Pinta Mistr"
              className="w-full bg-surface-container-low border-2 border-outline-variant rounded-xl p-3 focus:border-primary focus:outline-none text-on-surface text-sm"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setEditingUserId(null)}
              className="flex-1 bg-surface-variant text-on-surface-variant font-bold py-2.5 rounded-xl active:scale-95 transition-transform text-sm flex items-center justify-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              Zrušit
            </button>
            <button
              onClick={handleSaveUser}
              disabled={!editUserName.trim() || savingUser}
              className="flex-1 bg-primary text-on-primary font-bold py-2.5 rounded-xl active:translate-y-0.5 transition-all disabled:opacity-40 text-sm flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              {savingUser ? 'Ukládám…' : 'Uložit'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Add person modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Nový kamarád"
      >
        <div className="space-y-5">
          <div>
            <label className="font-mono text-[10px] uppercase text-outline mb-2 block tracking-widest">
              Jméno
            </label>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddUser(newName)}
              placeholder="např. Pinta Mistr"
              className="w-full bg-surface-container-low border-2 border-outline-variant rounded-xl p-4 focus:border-primary focus:outline-none text-on-surface"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowAddModal(false)}
              className="flex-1 bg-surface-variant text-on-surface-variant font-bold py-3 rounded-xl active:scale-95 transition-transform"
            >
              Zrušit
            </button>
            <button
              onClick={() => handleAddUser(newName)}
              disabled={!newName.trim() || adding}
              className="flex-1 bg-primary text-on-primary font-bold py-3 rounded-xl active:translate-y-0.5 transition-all disabled:opacity-40"
            >
              {adding ? 'Přidávám…' : 'Uložit'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

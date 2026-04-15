'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Plus, Loader2, AlertCircle, X } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase'
import { haptic } from '@/lib/haptics'

interface Props {
  open: boolean
  onClose: () => void
  prefilledName?: string
  prefilledAddress?: string
}

export function ManualPubAddModal({
  open,
  onClose,
  prefilledName = '',
  prefilledAddress = '',
}: Props) {
  const router = useRouter()
  const { toast } = useToast()

  const [name, setName] = useState(prefilledName)
  const [address, setAddress] = useState(prefilledAddress)
  const [loading, setLoading] = useState(false)
  const [nameError, setNameError] = useState('')

  // Synchronizuj stav s prefilled hodnotami při každém otevření modalu
  useEffect(() => {
    if (open) {
      setName(prefilledName)
      setAddress(prefilledAddress)
      setNameError('')
    }
  }, [open, prefilledName, prefilledAddress])

  function validate(): boolean {
    if (!name.trim() || name.trim().length < 2) {
      setNameError('Název musí mít alespoň 2 znaky.')
      return false
    }
    setNameError('')
    return true
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    haptic(20)

    if (!validate()) {
      haptic(50)
      return
    }

    setLoading(true)
    const { data: pub, error } = await supabase
      .from('pubs')
      .insert({ name: name.trim(), address: address.trim() || null })
      .select()
      .single()
    setLoading(false)

    if (error || !pub) {
      toast('Nepodařilo se vytvořit hospodu. Zkus to znovu.', 'error')
      haptic(50)
      return
    }

    toast(`Hospoda „${pub.name}" byla přidána.`, 'success')
    haptic(10)
    onClose()
    router.push(`/${pub.id}`)
    router.refresh()
  }

  if (!open) return null

  return (
    // z-[80] — musí být nad PubFinderModal (z-[70]) a základním Modal (z-[60])
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-surface-container border-2 border-outline-variant rounded-xl w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b-2 border-outline-variant/30">
          <h3 className="font-bold text-xl text-on-surface">Přidat hospodu ručně</h3>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors active:scale-90"
            aria-label="Zavřít"
          >
            <X className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Název */}
          <div>
            <label className="font-mono text-[10px] uppercase text-outline mb-2 block tracking-widest">
              Název hospody *
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError('') }}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e as unknown as React.FormEvent)}
              placeholder="např. U Zlatého kohouta"
              className={`w-full bg-surface-container-low border-2 rounded-xl p-3 focus:outline-none text-on-surface text-sm transition-colors ${
                nameError
                  ? 'border-error focus:border-error'
                  : 'border-outline-variant focus:border-primary'
              }`}
            />
            {nameError && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-error flex-shrink-0" />
                <p className="text-xs text-error">{nameError}</p>
              </div>
            )}
          </div>

          {/* Adresa */}
          <div>
            <label className="font-mono text-[10px] uppercase text-outline mb-2 block tracking-widest">
              Adresa (nepovinné)
            </label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="např. Vinohradská 102, Praha"
              className="w-full bg-surface-container-low border-2 border-outline-variant rounded-xl p-3 focus:border-primary focus:outline-none text-on-surface text-sm"
            />
          </div>

          {/* Info note */}
          <div className="flex items-start gap-2 bg-surface-container-low rounded-xl p-3 border border-outline-variant">
            <MapPin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Po vytvoření hospody ji najdeš v seznamu a můžeš přidat ceník ručně nebo ho naskenovat.
            </p>
          </div>

          {/* Tlačítka */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-surface-variant text-on-surface-variant font-bold py-2.5 rounded-xl active:scale-95 transition-transform text-sm"
            >
              Zrušit
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-primary text-on-primary font-bold py-2.5 rounded-xl active:translate-y-0.5 transition-all disabled:opacity-40 text-sm"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {loading ? 'Vytvářím…' : 'Vytvořit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

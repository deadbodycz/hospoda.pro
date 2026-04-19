'use client'

import { useState } from 'react'
import { X, PlusCircle, Info } from 'lucide-react'
import type { ScannedItem } from '@/types'
import BeerInfoSheet from './BeerInfoSheet'

interface ScanModalProps {
  items: ScannedItem[]
  onConfirm: (selected: ScannedItem[]) => void
  onClose: () => void
}

export function ScanModal({ items, onConfirm, onClose }: ScanModalProps) {
  const [checked, setChecked] = useState<Set<number>>(() => {
    // Pre-check all items by default
    return new Set(items.map((_, i) => i))
  })
  const [editing, setEditing] = useState<number | null>(null)
  const [editValues, setEditValues] = useState<ScannedItem[]>(items.map((i) => ({ ...i })))
  const [infoBeer, setInfoBeer] = useState<string | null>(null)

  function toggle(index: number) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  function handleConfirm() {
    const selected = editValues.filter((_, i) => checked.has(i))
    onConfirm(selected)
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-container-high w-full max-w-lg rounded-xl border-2 border-outline-variant shadow-2xl flex flex-col max-h-[85dvh]">
        {/* Header */}
        <div className="p-6 border-b-2 border-outline-variant flex items-start justify-between">
          <div>
            <h3 className="font-bold text-2xl text-on-surface">
              Nalezeno ({items.length})
            </h3>
            <p className="text-sm text-on-surface-variant mt-0.5">
              Zkontroluj a potvrď rozpoznané nápoje.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-highest transition-colors active:scale-90 ml-4 flex-shrink-0"
            aria-label="Zavřít"
          >
            <X className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 p-2 space-y-2 overscroll-contain">
          {editValues.map((item, i) => (
            <div
              key={i}
              className={`flex items-center gap-4 p-4 rounded-2xl bg-surface-container-low border transition-all ${
                checked.has(i)
                  ? 'border-transparent hover:border-outline-variant'
                  : 'border-transparent opacity-50'
              }`}
            >
              <input
                type="checkbox"
                checked={checked.has(i)}
                onChange={() => toggle(i)}
                className="w-6 h-6 rounded-lg bg-surface border-outline-variant accent-primary flex-shrink-0 cursor-pointer"
                aria-label={`Zahrnout ${item.name}`}
              />

              {editing === i ? (
                <div className="flex-1 space-y-2">
                  <input
                    autoFocus
                    value={item.name}
                    onChange={(e) => {
                      const next = [...editValues]
                      next[i] = { ...next[i], name: e.target.value }
                      setEditValues(next)
                    }}
                    onBlur={() => setEditing(null)}
                    className="w-full bg-surface-container border-2 border-primary rounded-xl px-3 py-1.5 text-on-surface text-sm font-bold focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <div className="flex flex-col flex-1">
                      <span className="font-mono text-[10px] text-outline uppercase mb-1">Malá</span>
                      <input
                        type="number"
                        value={item.priceSmall ?? ''}
                        placeholder="—"
                        onChange={(e) => {
                          const next = [...editValues]
                          next[i] = {
                            ...next[i],
                            priceSmall: e.target.value ? Number(e.target.value) : null,
                          }
                          setEditValues(next)
                        }}
                        className="bg-surface-container border-2 border-outline-variant rounded-xl px-3 py-1.5 text-on-surface text-sm font-mono focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="flex flex-col flex-1">
                      <span className="font-mono text-[10px] text-outline uppercase mb-1">Velká</span>
                      <input
                        type="number"
                        value={item.priceLarge ?? ''}
                        placeholder="—"
                        onChange={(e) => {
                          const next = [...editValues]
                          next[i] = {
                            ...next[i],
                            priceLarge: e.target.value ? Number(e.target.value) : null,
                          }
                          setEditValues(next)
                        }}
                        className="bg-surface-container border-2 border-outline-variant rounded-xl px-3 py-1.5 text-on-surface text-sm font-mono focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditing(i)}
                      className="flex-1 min-w-0 text-left"
                      aria-label={`Upravit ${item.name}`}
                    >
                      <p className="font-bold text-on-surface text-sm truncate">{item.name}</p>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setInfoBeer(item.name) }}
                      className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-surface-container-high active:scale-90 transition-all flex-shrink-0"
                      aria-label={`Info o ${item.name}`}
                    >
                      <Info className="w-3.5 h-3.5 text-on-surface-variant" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="font-mono text-[10px] text-primary uppercase tracking-widest">Klepnutím upravíš</p>
                    <div className="flex gap-3">
                      {item.priceSmall != null && (
                        <span className="font-mono text-xs text-on-surface tabular-nums">
                          {Math.round(item.priceSmall)}<span className="text-outline text-[9px] ml-0.5">m</span>
                        </span>
                      )}
                      {item.priceLarge != null && (
                        <span className="font-mono text-xs text-on-surface tabular-nums">
                          {Math.round(item.priceLarge)}<span className="text-outline text-[9px] ml-0.5">v</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 bg-surface-container-high border-t-2 border-outline-variant rounded-b-xl">
          <button
            onClick={handleConfirm}
            disabled={checked.size === 0}
            className="w-full bg-primary py-4 rounded-xl text-on-primary font-bold text-base
              flex items-center justify-center gap-2 active:translate-y-0.5 transition-all accent-shadow
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <PlusCircle className="w-5 h-5" />
            Přidat vybrané ({checked.size})
          </button>
        </div>
      </div>
      <BeerInfoSheet beerName={infoBeer} onClose={() => setInfoBeer(null)} />
    </div>
  )
}

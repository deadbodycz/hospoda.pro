'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { X, MapPin } from 'lucide-react'
import type { OsmPub } from '@/types'
import { haptic } from '@/lib/haptics'

const PubFinderMap = dynamic(() => import('./PubFinderMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-surface-container">
      <span className="text-on-surface-variant text-sm font-mono animate-pulse">
        Načítám mapu…
      </span>
    </div>
  ),
})

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (pub: OsmPub) => void
}

export function PubFinderModal({ open, onClose, onSelect }: Props) {
  const [pubs, setPubs] = useState<OsmPub[]>([])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      setPubs([])
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  function handleSelect(pub: OsmPub) {
    haptic(10)
    onSelect(pub)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-background"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 h-14 border-b-2 border-outline-variant flex-shrink-0">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          <h2 className="font-bold text-lg text-on-surface">Vyber hospodu</h2>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-container-high transition-colors active:scale-90"
          aria-label="Zavřít"
        >
          <X className="w-5 h-5 text-on-surface-variant" />
        </button>
      </div>

      {/* Mapa — 55dvh */}
      <div className="w-full flex-shrink-0" style={{ height: '55dvh' }}>
        <PubFinderMap onSelect={handleSelect} onPubsLoaded={setPubs} />
      </div>

      {/* Seznam výsledků */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-2">
        {pubs.length === 0 ? (
          <p className="text-center text-on-surface-variant text-sm font-mono pt-4">
            Přesuň mapu pro zobrazení hospod v okolí.
          </p>
        ) : (
          <>
            <p className="text-on-surface-variant text-xs font-mono uppercase tracking-widest mb-3">
              {pubs.length} hospod v oblasti
            </p>
            {pubs.map((pub) => (
              <button
                key={pub.id}
                onClick={() => handleSelect(pub)}
                className="w-full flex items-center gap-3 bg-surface border border-outline-variant rounded-xl px-4 py-3 active:scale-[0.99] transition-transform text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/12 border border-primary/25 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-on-surface text-sm leading-snug">{pub.name}</p>
                  {pub.address && (
                    <p className="text-xs text-outline mt-0.5 truncate">{pub.address}</p>
                  )}
                </div>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

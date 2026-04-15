'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { X, MapPin, Plus } from 'lucide-react'
import type { OsmPub } from '@/types'
import { haptic } from '@/lib/haptics'
import { ManualPubAddModal } from '@/components/ManualPubAddModal'

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
  const [mapLoaded, setMapLoaded] = useState(false)
  const [showManualAdd, setShowManualAdd] = useState(false)
  const [manualPrefillName, setManualPrefillName] = useState('')
  const [manualPrefillAddress, setManualPrefillAddress] = useState('')

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      setPubs([])
      setMapLoaded(false)
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

  function handleOpenManualAdd(name = '', address = '') {
    haptic(10)
    setManualPrefillName(name)
    setManualPrefillAddress(address)
    setShowManualAdd(true)
  }

  return (
    <>
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
          <PubFinderMap
            onSelect={handleSelect}
            onPubsLoaded={(loaded) => { setPubs(loaded); setMapLoaded(true) }}
          />
        </div>

        {/* Seznam výsledků */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-2">
          {!mapLoaded ? (
            <p className="text-center text-on-surface-variant text-sm font-mono pt-4">
              Přesuň mapu pro zobrazení hospod v okolí.
            </p>
          ) : pubs.length === 0 ? (
            /* Empty state: nabídni ruční přidání */
            <div className="flex flex-col items-center gap-4 pt-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-surface-container border border-outline-variant flex items-center justify-center">
                <MapPin className="w-6 h-6 text-outline-variant" />
              </div>
              <div>
                <p className="font-semibold text-on-surface text-sm">
                  V této oblasti nejsou žádné hospody
                </p>
                <p className="text-xs text-on-surface-variant mt-1">
                  Zkus přiblížit nebo posuň mapu, nebo hospodu přidej ručně.
                </p>
              </div>
              <button
                onClick={() => handleOpenManualAdd()}
                className="flex items-center gap-2 bg-primary text-on-primary font-bold px-5 py-3 rounded-xl active:translate-y-0.5 transition-all text-sm accent-shadow"
              >
                <Plus className="w-4 h-4" />
                Přidat hospodu ručně
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-1">
                <p className="text-on-surface-variant text-xs font-mono uppercase tracking-widest">
                  {pubs.length} hospod v oblasti
                </p>
                <button
                  onClick={() => handleOpenManualAdd()}
                  className="flex items-center gap-1 text-xs text-primary font-semibold active:opacity-70 transition-opacity"
                >
                  <Plus className="w-3 h-3" />
                  Přidat ručně
                </button>
              </div>
              {pubs.map((pub) => (
                <button
                  key={pub.id}
                  onClick={() => handleSelect(pub)}
                  className="w-full flex items-center gap-3 bg-surface border border-outline-variant rounded-xl px-4 py-3 active:scale-[0.99] transition-transform text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/12 border border-primary/25 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-primary" aria-hidden />
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

      {/* ManualPubAddModal — z-index 80, nad PubFinderModal */}
      <ManualPubAddModal
        open={showManualAdd}
        onClose={() => setShowManualAdd(false)}
        prefilledName={manualPrefillName}
        prefilledAddress={manualPrefillAddress}
      />
    </>
  )
}

'use client'

import { useEffect, useState, useRef } from 'react'
import { X, ExternalLink } from 'lucide-react'
import type { BeerInfoResult } from '@/types'
import { inferStyleEntryFromBeerName, getBeerStyleById } from '@/lib/beer-styles'
import SrmColorSwatch from './SrmColorSwatch'

interface BeerInfoSheetProps {
  beerName: string | null
  onClose: () => void
}

function buildFallback(beerName: string): BeerInfoResult {
  const entry = inferStyleEntryFromBeerName(beerName)
  return {
    name: entry ? entry[1].name_cz : beerName,
    styleId: entry ? entry[0] : undefined,
    abv: null,
    brewery: null,
    description: entry ? entry[1].description_cz : 'Informace o tomto pivu nejsou k dispozici.',
    source: 'fallback',
  }
}

export default function BeerInfoSheet({ beerName, onClose }: BeerInfoSheetProps) {
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BeerInfoResult | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!beerName) {
      setVisible(false)
      setResult(null)
      return
    }

    setVisible(true)
    setLoading(true)
    setResult(null)

    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac

    const timeout = setTimeout(() => {
      ac.abort()
      setResult(buildFallback(beerName))
      setLoading(false)
    }, 500)

    fetch('/api/beer-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ beerName }),
      signal: ac.signal,
    })
      .then((r) => r.json())
      .then((data: BeerInfoResult) => {
        clearTimeout(timeout)
        if (!ac.signal.aborted) {
          setResult(data)
          setLoading(false)
        }
      })
      .catch(() => {
        clearTimeout(timeout)
        if (!ac.signal.aborted) {
          setResult(buildFallback(beerName))
          setLoading(false)
        }
      })

    return () => {
      clearTimeout(timeout)
      ac.abort()
    }
  }, [beerName])

  if (!beerName) return null

  const style = result?.styleId ? getBeerStyleById(result.styleId) : null
  const srmValue = style?.color_srm ?? null

  return (
    <div className={`fixed inset-0 z-[80] flex flex-col justify-end transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Sheet */}
      <div
        className={`relative bg-surface-container rounded-t-2xl max-h-[75dvh] flex flex-col transition-transform duration-300 ${visible ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-outline rounded-full" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-high active:scale-90 transition-all"
          aria-label="Zavřít"
        >
          <X className="w-4 h-4 text-on-surface-variant" />
        </button>

        {/* Content */}
        <div className="overflow-y-auto overscroll-contain flex-1 px-6 pb-6">
          {loading ? (
            <div className="animate-pulse space-y-4 pt-4">
              <div className="h-6 bg-surface-container-high rounded-xl w-2/3" />
              <div className="h-4 bg-surface-container-high rounded-xl w-1/3" />
              <div className="h-16 bg-surface-container-high rounded-xl" />
              <div className="h-4 bg-surface-container-high rounded-xl w-1/2" />
            </div>
          ) : result ? (
            <div className="pt-2 space-y-4">
              {/* Header: název + SRM + ABV */}
              <div className="flex items-start gap-3">
                {srmValue && (
                  <SrmColorSwatch
                    srm={srmValue}
                    label={style?.color_cz}
                    size="md"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-lg text-on-surface leading-tight">{result.name}</h2>
                  {style && (
                    <p className="text-xs text-on-surface-variant mt-0.5">{style.name_en}</p>
                  )}
                </div>
                {result.abv !== null && (
                  <span className="flex-shrink-0 bg-primary/20 text-primary text-xs font-mono font-bold px-2 py-1 rounded-lg tabular-nums">
                    {result.abv} %
                  </span>
                )}
              </div>

              {/* Pivovar */}
              {result.brewery && (
                <p className="text-sm text-on-surface-variant">
                  Pivovar: <span className="text-on-surface font-medium">{result.brewery}</span>
                </p>
              )}

              {/* Popis */}
              {result.description && (
                <p className="text-sm text-on-surface leading-relaxed">{result.description}</p>
              )}

              {/* Styl detaily (IBU, barva) */}
              {style && (
                <div className="grid grid-cols-3 gap-2">
                  {style.abv_range && (
                    <div className="bg-surface-container-high rounded-xl p-3 text-center">
                      <p className="text-[10px] text-on-surface-variant uppercase font-mono tracking-widest">ABV</p>
                      <p className="text-sm font-mono font-bold text-on-surface mt-1">{style.abv_range}</p>
                    </div>
                  )}
                  {style.ibu_range && (
                    <div className="bg-surface-container-high rounded-xl p-3 text-center">
                      <p className="text-[10px] text-on-surface-variant uppercase font-mono tracking-widest">IBU</p>
                      <p className="text-sm font-mono font-bold text-on-surface mt-1">{style.ibu_range}</p>
                    </div>
                  )}
                  {style.color_cz && (
                    <div className="bg-surface-container-high rounded-xl p-3 text-center">
                      <p className="text-[10px] text-on-surface-variant uppercase font-mono tracking-widest">Barva</p>
                      <p className="text-xs font-bold text-on-surface mt-1 leading-tight">{style.color_cz}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Food pairing */}
              {style?.food_pairing_cz && (
                <div>
                  <p className="text-xs text-on-surface-variant uppercase font-mono tracking-widest mb-1">K jídlu</p>
                  <p className="text-sm text-on-surface">{style.food_pairing_cz}</p>
                </div>
              )}

              {/* CTA tlačítka */}
              <div className="flex gap-2 pt-2">
                <a
                  href={`https://untappd.com/search?q=${encodeURIComponent(beerName ?? '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 bg-surface-container-high border-2 border-outline-variant rounded-xl py-3 text-sm font-bold text-on-surface active:scale-95 transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  Untappd
                </a>
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent((beerName ?? '') + ' pivo')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 bg-surface-container-high border-2 border-outline-variant rounded-xl py-3 text-sm font-bold text-on-surface active:scale-95 transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  Google
                </a>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

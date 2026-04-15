'use client'

import { useEffect, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import type { OsmPub } from '@/types'
import { searchPubsNearby, type Bounds } from '@/lib/overpass'
import { haptic } from '@/lib/haptics'

interface Props {
  onSelect: (pub: OsmPub) => void
  onPubsLoaded?: (pubs: OsmPub[]) => void
}

const PRAGUE: [number, number] = [50.0755, 14.4378]
const INITIAL_ZOOM = 14

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function markerHtml(): string {
  const beerSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 11h1a3 3 0 0 1 0 6h-1"/><path d="M9 12v6"/><path d="M13 12v6"/><path d="M14 7.5c-1 0-1.44.5-3 .5s-2-.5-3-.5-1.44.5-3 .5"/><path d="M3 8v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8"/><path d="M5 8v0a2 2 0 0 1 4 0"/></svg>`
  return `<div style="
    background:#8A9900;
    color:#fff;
    border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);
    width:32px;height:32px;
    border:2px solid rgba(255,255,255,0.85);
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 2px 8px rgba(0,0,0,0.45);
  "><span style="transform:rotate(45deg);display:flex;align-items:center;justify-content:center">${beerSvg}</span></div>`
}

type MapStatus = 'idle' | 'loading' | 'empty' | 'error'

export default function PubFinderMap({ onSelect, onPubsLoaded }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<import('leaflet').Map | null>(null)
  const markersRef = useRef<import('leaflet').Marker[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onSelectRef = useRef(onSelect)
  const onPubsLoadedRef = useRef(onPubsLoaded)
  const retryRef = useRef<(() => void) | null>(null)
  const [status, setStatus] = useState<MapStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  // Always keep refs current so stale-closure in useEffect callbacks is not an issue
  onSelectRef.current = onSelect
  onPubsLoadedRef.current = onPubsLoaded

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    let cancelled = false

    async function init() {
      const L = (await import('leaflet')).default

      async function fetchAndRender(map: import('leaflet').Map) {
        const b = map.getBounds()
        const bounds: Bounds = {
          north: b.getNorth(),
          south: b.getSouth(),
          east: b.getEast(),
          west: b.getWest(),
        }

        setStatus('loading')
        try {
          const pubs = await searchPubsNearby(bounds)

          if (cancelled) return

          // Remove old markers only after successful fetch
          markersRef.current.forEach((m) => m.remove())
          markersRef.current = []

          onPubsLoadedRef.current?.(pubs)

          if (pubs.length === 0) {
            setStatus('empty')
            return
          }

          pubs.forEach((pub) => {
            const icon = L.divIcon({
              html: markerHtml(),
              className: '',
              iconSize: [32, 32],
              iconAnchor: [16, 32],
              popupAnchor: [0, -38],
            })

            const popupEl = document.createElement('div')
            popupEl.style.cssText = 'min-width:160px;font-family:sans-serif'
            popupEl.innerHTML = `
              <strong style="display:block;margin-bottom:4px;font-size:14px;color:#1a1a1a">${escHtml(pub.name)}</strong>
              ${pub.address ? `<span style="display:block;font-size:12px;color:#666;margin-bottom:8px">${escHtml(pub.address)}</span>` : ''}
              <button style="background:#8A9900;color:#fff;border:none;padding:8px 14px;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;width:100%">
                Vybrat tuto hospodu
              </button>
            `
            popupEl.querySelector('button')?.addEventListener('click', () => {
              haptic(10)
              onSelectRef.current(pub)
            })

            const marker = L.marker([pub.lat, pub.lon], { icon })
            marker.bindPopup(L.popup({ closeButton: false }).setContent(popupEl))
            marker.addTo(map)
            markersRef.current.push(marker)
          })

          setStatus('idle')
        } catch (e) {
          if (cancelled) return
          setStatus('error')
          setErrorMsg('Nepodařilo se načíst hospody. Zkus to znovu.')
        }
      }

      const map = L.map(containerRef.current!, { zoomControl: true })
      mapRef.current = map

      retryRef.current = () => fetchAndRender(map)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map)

      // Zobraz Prahu ihned — mapa je použitelná okamžitě
      map.setView(PRAGUE, INITIAL_ZOOM)
      fetchAndRender(map)

      // Pokud geolokace uspěje, přesuň mapu na skutečnou polohu
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!cancelled) {
              map.setView([pos.coords.latitude, pos.coords.longitude], INITIAL_ZOOM)
              fetchAndRender(map)
            }
          },
          () => { /* fallback Praha je už zobrazena */ },
          { timeout: 5000 }
        )
      }

      map.on('moveend', () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => fetchAndRender(map), 300)
      })
    }

    init()

    return () => {
      cancelled = true
      if (debounceRef.current) clearTimeout(debounceRef.current)
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, []) // map init runs exactly once

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {status === 'loading' && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] bg-surface border border-outline-variant rounded-xl px-4 py-2 text-on-surface text-sm font-mono pointer-events-none">
          Načítám…
        </div>
      )}
      {status === 'error' && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] bg-error-container text-error rounded-xl px-4 py-2 text-sm max-w-[280px] text-center">
          <p>{errorMsg}</p>
          <button
            onClick={() => retryRef.current?.()}
            className="mt-2 text-xs underline"
          >
            Zkusit znovu
          </button>
        </div>
      )}
      {status === 'empty' && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] bg-surface border border-outline-variant rounded-xl px-4 py-2 text-on-surface-variant text-sm font-mono pointer-events-none">
          V této oblasti nejsou žádné hospody.
        </div>
      )}
    </div>
  )
}

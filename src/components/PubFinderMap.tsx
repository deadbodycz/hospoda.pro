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
  return `<div style="
    background:#8A9900;
    color:#fff;
    border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);
    width:32px;height:32px;
    border:2px solid rgba(255,255,255,0.85);
    display:flex;align-items:center;justify-content:center;
    font-size:15px;
    box-shadow:0 2px 8px rgba(0,0,0,0.45);
  "><span style="transform:rotate(45deg);line-height:1">🍺</span></div>`
}

type MapStatus = 'idle' | 'loading' | 'empty' | 'error'

export default function PubFinderMap({ onSelect, onPubsLoaded }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<import('leaflet').Map | null>(null)
  const markersRef = useRef<import('leaflet').Marker[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onSelectRef = useRef(onSelect)
  const onPubsLoadedRef = useRef(onPubsLoaded)
  const [status, setStatus] = useState<MapStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  // Always keep refs current so stale-closure in useEffect callbacks is not an issue
  onSelectRef.current = onSelect
  onPubsLoadedRef.current = onPubsLoaded

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    async function fetchAndRender(map: import('leaflet').Map) {
      const L = (await import('leaflet')).default
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

        // Remove old markers
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
        setStatus('error')
        setErrorMsg(
          e instanceof Error ? e.message : 'Nepodařilo se načíst hospody. Zkus to znovu.'
        )
      }
    }

    async function init() {
      const L = (await import('leaflet')).default

      const map = L.map(containerRef.current!, { zoomControl: true })
      mapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map)

      const startAt = (lat: number, lon: number) => {
        map.setView([lat, lon], INITIAL_ZOOM)
        fetchAndRender(map)
      }

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => startAt(pos.coords.latitude, pos.coords.longitude),
          () => startAt(PRAGUE[0], PRAGUE[1]),
          { timeout: 5000 }
        )
      } else {
        startAt(PRAGUE[0], PRAGUE[1])
      }

      map.on('moveend', () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => fetchAndRender(map), 300)
      })
    }

    init()

    return () => {
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
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] bg-error-container text-error rounded-xl px-4 py-2 text-sm max-w-[280px] text-center pointer-events-none">
          {errorMsg}
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

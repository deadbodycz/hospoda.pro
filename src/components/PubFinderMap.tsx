'use client'

// This component is always loaded via dynamic(() => import(...), { ssr: false })
// so module-level browser-API imports are safe.
import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { OsmPub, Bounds } from '@/types'
import { getMapStyle } from '@/lib/maptiler-style'
import { searchPubsNearby } from '@/lib/maptiler-places'
import { useTheme } from '@/contexts/ThemeContext'
import { haptic } from '@/lib/haptics'

const PRAGUE: [number, number] = [14.4378, 50.0755] // [lng, lat] — MapLibre convention
const INITIAL_ZOOM = 14
const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? ''

interface Props {
  onSelect: (pub: OsmPub) => void
  onPubsLoaded?: (pubs: OsmPub[]) => void
}

type MapStatus = 'idle' | 'loading' | 'empty' | 'error'

// GeoJSON feature properties stored in map source
interface PubFeatureProps {
  id: string
  name: string
  address: string
  lat: number
  lon: number
}

function pubsToGeoJSON(pubs: OsmPub[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: pubs.map((pub) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [pub.lon, pub.lat] },
      properties: {
        id: pub.id,
        name: pub.name,
        address: pub.address ?? '',
        lat: pub.lat,
        lon: pub.lon,
      } satisfies PubFeatureProps,
    })),
  }
}

function addPubLayers(map: maplibregl.Map) {
  if (!map.getSource('pubs')) {
    map.addSource('pubs', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    })
  }

  if (!map.getLayer('pubs-circle')) {
    map.addLayer({
      id: 'pubs-circle',
      type: 'circle',
      source: 'pubs',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 6, 16, 12],
        'circle-color': '#8A9900',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-opacity': 0.9,
      },
    })
  }

  if (!map.getLayer('pubs-labels')) {
    map.addLayer({
      id: 'pubs-labels',
      type: 'symbol',
      source: 'pubs',
      layout: {
        'text-field': ['get', 'name'],
        'text-size': 11,
        'text-offset': [0, 1.2],
        'text-anchor': 'top',
        'text-optional': true,
      },
      paint: {
        'text-color': '#f0f0f0',
        'text-halo-color': '#0d0d0e',
        'text-halo-width': 1.5,
      },
    })
  }
}

export default function PubFinderMap({ onSelect, onPubsLoaded }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onSelectRef = useRef(onSelect)
  const onPubsLoadedRef = useRef(onPubsLoaded)
  const currentPubsRef = useRef<OsmPub[]>([])
  const retryRef = useRef<(() => void) | null>(null)
  const { theme } = useTheme()
  const [status, setStatus] = useState<MapStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  // Keep refs current so stale closures don't cause issues
  onSelectRef.current = onSelect
  onPubsLoadedRef.current = onPubsLoaded

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    let cancelled = false

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getMapStyle(theme as 'dark' | 'light', MAPTILER_KEY),
      center: PRAGUE,
      zoom: INITIAL_ZOOM,
      attributionControl: false,
    })

    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-left'
    )

    mapRef.current = map

    async function fetchAndRender() {
      if (!mapRef.current || cancelled) return

      const b = mapRef.current.getBounds()
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

        currentPubsRef.current = pubs
        onPubsLoadedRef.current?.(pubs)

        const source = mapRef.current?.getSource('pubs') as maplibregl.GeoJSONSource | undefined
        source?.setData(pubsToGeoJSON(pubs))

        setStatus(pubs.length === 0 ? 'empty' : 'idle')
      } catch {
        if (!cancelled) {
          setStatus('error')
          setErrorMsg('Nepodařilo se načíst hospody. Zkus to znovu.')
        }
      }
    }

    retryRef.current = fetchAndRender

    map.on('load', () => {
      if (cancelled) return

      addPubLayers(map)

      // Click handler on circles
      map.on('click', 'pubs-circle', (e) => {
        haptic(10)
        const features = e.features
        if (!features || features.length === 0) return
        const props = features[0].properties as PubFeatureProps
        const pub: OsmPub = {
          id: props.id,
          name: props.name,
          lat: props.lat,
          lon: props.lon,
          address: props.address || undefined,
        }
        onSelectRef.current(pub)
      })

      map.on('mouseenter', 'pubs-circle', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'pubs-circle', () => {
        map.getCanvas().style.cursor = ''
      })

      // Initial fetch
      fetchAndRender()

      // Geolocation — show Praha immediately, fly to real position when ready
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!cancelled) {
              map.flyTo({
                center: [pos.coords.longitude, pos.coords.latitude],
                zoom: INITIAL_ZOOM,
                duration: 1500,
              })
            }
          },
          () => { /* Praha already shown, no action needed */ },
          { timeout: 5000 }
        )
      }
    })

    // Re-add layers after style change (e.g. dark/light toggle while modal is open)
    map.on('style.load', () => {
      if (cancelled) return
      addPubLayers(map)
      // Restore current pubs into the new source
      const source = map.getSource('pubs') as maplibregl.GeoJSONSource | undefined
      if (source && currentPubsRef.current.length > 0) {
        source.setData(pubsToGeoJSON(currentPubsRef.current))
      }
    })

    map.on('moveend', () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(fetchAndRender, 300)
    })

    return () => {
      cancelled = true
      if (debounceRef.current) clearTimeout(debounceRef.current)
      map.remove()
      mapRef.current = null
    }
  }, []) // Map init runs exactly once

  // Update style when theme changes (layers re-added via style.load handler above)
  useEffect(() => {
    if (!mapRef.current) return
    mapRef.current.setStyle(getMapStyle(theme as 'dark' | 'light', MAPTILER_KEY))
  }, [theme])

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
          <button onClick={() => retryRef.current?.()} className="mt-2 text-xs underline">
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

'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Camera, ImagePlus, ScanLine, Loader2, X } from 'lucide-react'
import { useSession } from '@/contexts/SessionContext'
import { supabase } from '@/lib/supabase'
import { ScanModal } from '@/components/ScanModal'
import { BottomNav } from '@/components/BottomNav'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useToast } from '@/components/ui/Toast'
import type { ScannedItem } from '@/types'

type PageState = 'idle' | 'processing' | 'results' | 'error'

/** Client-side image compression — max 1500px, JPEG 0.82 */
async function compressImage(file: File): Promise<{ base64: string; mediaType: 'image/jpeg' }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const MAX = 1500
      let { width, height } = img
      if (width > MAX || height > MAX) {
        if (width > height) {
          height = Math.round((height * MAX) / width)
          width = MAX
        } else {
          width = Math.round((width * MAX) / height)
          height = MAX
        }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas not supported')); return }
      ctx.drawImage(img, 0, 0, width, height)
      const base64 = canvas.toDataURL('image/jpeg', 0.82).split(',')[1]
      resolve({ base64, mediaType: 'image/jpeg' })
    }
    img.onerror = reject
    img.src = url
  })
}

export default function ScanPage({ params }: { params: { pubId: string } }) {
  const { addDrinks, updateMenuPhoto } = useSession()
  const router = useRouter()
  const { toast } = useToast()

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const [pageState, setPageState] = useState<PageState>('idle')
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([])
  const [errorMessage, setErrorMessage] = useState('')

  async function handleFile(file: File) {
    setPageState('processing')
    try {
      const { base64, mediaType } = await compressImage(file)

      const formData = new FormData()
      formData.append('base64', base64)
      formData.append('mediaType', mediaType)

      const res = await fetch('/api/scan', { method: 'POST', body: formData })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }

      const { items } = (await res.json()) as { items: ScannedItem[] }
      if (items.length === 0) {
        setErrorMessage('Žádné nápoje nebyly rozpoznány. Zkus jiný snímek.')
        setPageState('error')
        return
      }
      // Upload fotky do Storage (tiché selhání — sken pokračuje i bez fotky)
      try {
        // Použijeme komprimovanou verzi (výstup compressImage), ne originální soubor
        const byteChars = atob(base64)
        const byteArr = new Uint8Array(byteChars.length)
        for (let i = 0; i < byteChars.length; i++) {
          byteArr[i] = byteChars.charCodeAt(i)
        }
        const blob = new Blob([byteArr], { type: 'image/jpeg' })
        const { error: uploadError } = await supabase.storage
          .from('menu-photos')
          .upload(`${params.pubId}.jpg`, blob, { upsert: true, contentType: 'image/jpeg' })
        if (!uploadError) {
          const { data } = supabase.storage.from('menu-photos').getPublicUrl(`${params.pubId}.jpg`)
          const url = `${data.publicUrl}?t=${Date.now()}`
          await updateMenuPhoto(url)
        }
      } catch {
        // tiché selhání — fotka se neuloží, ale sken pokračuje normálně
      }

      setScannedItems(items)
      setPageState('results')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Nepodařilo se načíst ceník. Zkus to znovu.')
      setPageState('error')
    }
  }

  async function handleConfirm(selected: ScannedItem[]) {
    await addDrinks(selected)
    toast(`Přidáno ${selected.length} nápojů do ceníku.`, 'success')
    router.push(`/${params.pubId}`)
  }

  return (
    <div className="min-h-[100dvh] bg-background text-on-background pb-32">
      {/* Header */}
      <header className="fixed top-0 w-full h-12 z-50 bg-zinc-950/60 backdrop-blur-md border-b-2 border-zinc-800/20 flex justify-between items-center px-6">
        <div className="flex items-center gap-2">
          <ScanLine className="w-5 h-5 text-primary" />
          <h1 className="text-primary font-bold tracking-tighter text-xl">hospoda.pro</h1>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Link
            href={`/${params.pubId}`}
            className="w-10 h-10 flex items-center justify-center hover:bg-zinc-800/50 rounded-full transition-colors active:scale-95"
            aria-label="Zpět"
          >
            <X className="w-5 h-5 text-on-surface-variant" />
          </Link>
        </div>
      </header>

      <main className="pt-12 px-4 max-w-2xl mx-auto space-y-6">
        {/* Title */}
        <section className="mt-8 text-center">
          <h2 className="font-bold text-3xl tracking-tight text-on-surface mb-2">
            Importovat ceník
          </h2>
          <p className="text-on-surface-variant">
            Naskenuj nápojový lístek a přidej ho za vteřiny.
          </p>
        </section>

        {/* Split screen buttons */}
        <div className="grid grid-cols-1 gap-4 h-auto md:grid-cols-2">
          {/* Camera */}
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="group relative overflow-hidden rounded-xl border-2 border-outline-variant bg-surface-container-low flex flex-col items-center justify-center p-8 transition-all hover:border-primary active:scale-95 min-h-[200px]"
          >
            <div className="z-10 bg-primary/10 p-6 rounded-full mb-4">
              <Camera className="w-10 h-10 text-primary" />
            </div>
            <span className="z-10 font-bold text-xl text-on-surface">Vyfotit ceník</span>
          </button>

          {/* Gallery */}
          <button
            onClick={() => galleryInputRef.current?.click()}
            className="group relative overflow-hidden rounded-xl border-2 border-outline-variant bg-surface-container-low flex flex-col items-center justify-center p-8 transition-all hover:border-primary active:scale-95 min-h-[200px]"
          >
            <div className="z-10 bg-primary/10 p-6 rounded-full mb-4">
              <ImagePlus className="w-10 h-10 text-primary" />
            </div>
            <span className="z-10 font-bold text-xl text-on-surface">Nahrát z galerie</span>
          </button>
        </div>

        {/* Error state */}
        {pageState === 'error' && (
          <div className="flex items-center gap-3 bg-error-container/20 border-2 border-error/30 rounded-xl p-4">
            <ArrowLeft className="w-5 h-5 text-error flex-shrink-0 rotate-180" />
            <p className="text-on-surface-variant text-sm">{errorMessage}</p>
            <button
              onClick={() => setPageState('idle')}
              className="ml-auto text-primary font-bold text-sm underline flex-shrink-0"
            >
              Znovu
            </button>
          </div>
        )}

        {/* Manual add link */}
        <div className="text-center pb-8">
          <Link
            href={`/${params.pubId}`}
            className="text-primary font-mono uppercase tracking-widest text-xs hover:underline underline-offset-4 transition-all"
          >
            Přidat ručně
          </Link>
        </div>
      </main>

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />

      {/* Processing overlay */}
      {pageState === 'processing' && (
        <div className="fixed inset-0 z-[60] bg-surface-container-lowest/90 backdrop-blur-xl flex flex-col items-center justify-center gap-6">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="font-bold text-xl text-on-surface tracking-tight">
            Rozpoznávám nápoje…
          </p>
          <p className="font-mono text-xs text-outline uppercase tracking-tighter">
            AI analýza probíhá
          </p>
        </div>
      )}

      {/* Results modal */}
      {pageState === 'results' && scannedItems.length > 0 && (
        <ScanModal
          items={scannedItems}
          onConfirm={handleConfirm}
          onClose={() => setPageState('idle')}
        />
      )}

      <BottomNav pubId={params.pubId} />
    </div>
  )
}

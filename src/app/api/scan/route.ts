import { NextRequest, NextResponse } from 'next/server'
import { extractTextFromImage } from '@/lib/googleVision'
import { parseMenuText } from '@/lib/anthropic'
import { verifyProUser } from '@/lib/verifyProUser'

export const maxDuration = 60 // sekund — potřebujeme Vision + Claude

export async function POST(req: NextRequest) {
  const isPro = await verifyProUser(req)
  if (!isPro) {
    return NextResponse.json({ error: 'Vyžaduje PRO předplatné' }, { status: 403 })
  }

  try {
    const form = await req.formData()
    const base64 = form.get('base64') as string | null
    if (!base64) {
      return NextResponse.json({ error: 'Chybí obrázek.' }, { status: 400 })
    }

    // Step 1: Google Vision OCR
    let ocrText: string
    try {
      ocrText = await extractTextFromImage(base64)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[scan][vision]', msg)
      return NextResponse.json({ error: `Vision: ${msg}` }, { status: 500 })
    }

    if (!ocrText.trim()) {
      return NextResponse.json({ items: [] })
    }

    // Step 2: Claude parses the extracted text
    let items: Awaited<ReturnType<typeof parseMenuText>>
    try {
      items = await parseMenuText(ocrText)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[scan][claude]', msg)
      return NextResponse.json({ error: `Claude: ${msg}` }, { status: 500 })
    }

    return NextResponse.json({ items })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[scan]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

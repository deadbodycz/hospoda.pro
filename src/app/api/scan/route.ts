import { NextRequest, NextResponse } from 'next/server'
import { extractTextFromImage } from '@/lib/googleVision'
import { parseMenuText } from '@/lib/anthropic'

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const base64 = form.get('base64') as string | null
    if (!base64) {
      return NextResponse.json({ error: 'Chybí obrázek.' }, { status: 400 })
    }

    // Step 1: Google Vision OCR
    const ocrText = await extractTextFromImage(base64)

    if (!ocrText.trim()) {
      return NextResponse.json({ items: [] })
    }

    // Step 2: Claude parses the extracted text
    const items = await parseMenuText(ocrText)

    return NextResponse.json({ items })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[scan]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

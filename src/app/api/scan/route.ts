import { NextRequest, NextResponse } from 'next/server'
import { extractTextFromImage } from '@/lib/googleVision'
import { parseMenuText } from '@/lib/anthropic'

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('image') as File | null
    if (!file) {
      return NextResponse.json({ error: 'Chybí obrázek.' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    // Step 1: Google Vision OCR
    const ocrText = await extractTextFromImage(base64)

    if (!ocrText.trim()) {
      return NextResponse.json({ items: [] })
    }

    // Step 2: Claude parses the extracted text
    const items = await parseMenuText(ocrText)

    return NextResponse.json({ items })
  } catch (err) {
    console.error('[scan]', err)
    return NextResponse.json(
      { error: 'Nepodařilo se rozpoznat text z obrázku. Zkus to znovu.' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { parseMenuText } from '@/lib/anthropic'

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Chybí OCR text.' }, { status: 400 })
    }

    const items = await parseMenuText(text)
    return NextResponse.json({ items })
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[/api/scan]', err)
    }
    return NextResponse.json(
      { error: 'Nepodařilo se rozpoznat ceník.' },
      { status: 500 }
    )
  }
}

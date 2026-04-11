import { NextRequest, NextResponse } from 'next/server'
import { scanMenuImage } from '@/lib/anthropic'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const base64 = formData.get('base64') as string | null
    const mediaType = (formData.get('mediaType') as string | null) ?? 'image/jpeg'

    if (!base64) {
      return NextResponse.json({ error: 'Chybí obrázek.' }, { status: 400 })
    }

    const validMediaTypes = ['image/jpeg', 'image/png', 'image/webp'] as const
    type ValidMediaType = (typeof validMediaTypes)[number]
    const resolvedMediaType: ValidMediaType = (validMediaTypes as readonly string[]).includes(mediaType)
      ? (mediaType as ValidMediaType)
      : 'image/jpeg'

    const items = await scanMenuImage(base64, resolvedMediaType)
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

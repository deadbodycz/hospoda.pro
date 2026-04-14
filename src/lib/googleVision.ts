/**
 * Google Cloud Vision — DOCUMENT_TEXT_DETECTION via REST API.
 * Returns the full extracted text from an image, or empty string if none found.
 */

const VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate'

interface VisionResponse {
  responses: Array<{
    fullTextAnnotation?: {
      text: string
    }
    error?: {
      message: string
    }
  }>
}

export async function extractTextFromImage(
  base64Image: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg'
): Promise<string> {
  const apiKey = process.env.GOOGLE_VISION_API_KEY
  if (!apiKey) throw new Error('GOOGLE_VISION_API_KEY není nastavený')

  const body = {
    requests: [
      {
        image: { content: base64Image },
        features: [{ type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }],
        imageContext: { languageHints: ['cs', 'sk'] },
      },
    ],
  }

  const res = await fetch(`${VISION_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw new Error(`Google Vision API error: ${res.status} ${res.statusText}`)
  }

  const data: VisionResponse = await res.json()
  const response = data.responses[0]

  if (response.error) {
    throw new Error(`Google Vision error: ${response.error.message}`)
  }

  return response.fullTextAnnotation?.text ?? ''
}

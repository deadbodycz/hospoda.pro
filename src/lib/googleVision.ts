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

export async function extractTextFromImage(base64Image: string): Promise<string> {
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

  let res: Response
  try {
    res = await fetch(VISION_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify(body),
    })
  } catch (err) {
    throw new Error(
      `Nepodařilo se připojit k Google Vision API: ${err instanceof Error ? err.message : 'neznámá chyba'}`
    )
  }

  if (!res.ok) {
    throw new Error(`Google Vision API error: ${res.status} ${res.statusText}`)
  }

  const data: VisionResponse = await res.json()

  if (!Array.isArray(data.responses) || data.responses.length === 0) {
    throw new Error('Google Vision API vrátila prázdnou odpověď')
  }

  const response = data.responses[0]

  if (response.error) {
    throw new Error(`Google Vision error: ${response.error.message}`)
  }

  return response.fullTextAnnotation?.text ?? ''
}

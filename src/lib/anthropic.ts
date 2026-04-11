import Anthropic from '@anthropic-ai/sdk'
import type { ScannedItem } from '@/types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SCAN_PROMPT = `Jsi asistent pro restaurace. Z přiloženého obrázku ceníku nápojů extrahuj seznam nápojů.
Vrať POUZE JSON v tomto formátu, bez markdown:
{
  "items": [
    { "name": "Pilsner Urquell 0,5l", "priceSmall": null, "priceLarge": 52 },
    { "name": "Kozel 0,3l", "priceSmall": 38, "priceLarge": null }
  ]
}
Pravidla:
- name: název nápoje včetně objemu
- priceSmall: cena malé porce (0,3l nebo 0,2l) nebo null
- priceLarge: cena velké porce (0,5l nebo 0,4l) nebo null
- Zahrň pouze nápoje s jasnou cenou
- Ignoruj jídla`

export async function scanMenuImage(base64Image: string, mediaType: 'image/jpeg' | 'image/png' | 'image/webp'): Promise<ScannedItem[]> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Image,
            },
          },
          {
            type: 'text',
            text: SCAN_PROMPT,
          },
        ],
      },
    ],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  const parsed = JSON.parse(text) as { items: ScannedItem[] }
  return parsed.items
}

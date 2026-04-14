import Anthropic from '@anthropic-ai/sdk'
import type { ScannedItem } from '@/types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const PARSE_PROMPT = `Z níže uvedeného textu z ceníku nápojů extrahuj seznam nápojů.
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
- Ignoruj jídla
- Pokud text neobsahuje žádné nápoje, vrať { "items": [] }`

export async function parseMenuText(ocrText: string): Promise<ScannedItem[]> {
  if (!ocrText.trim()) return []

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `${PARSE_PROMPT}\n\nTEXT Z CENÍKU:\n${ocrText}`,
      },
    ],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const parsed = JSON.parse(text) as { items: ScannedItem[] }
  return parsed.items
}

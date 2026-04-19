import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { BeerInfoResult } from '@/types'

export const maxDuration = 15

const STYLE_KEYS = [
  'cz_pale_lager', 'cz_amber_lager', 'cz_dark_lager', 'german_pils', 'munich_helles',
  'dunkel', 'bock', 'doppelbock', 'british_golden_ale', 'british_bitter', 'esb',
  'irish_stout', 'american_pale_ale', 'american_ipa', 'new_england_ipa', 'west_coast_ipa',
  'american_amber_ale', 'american_brown_ale', 'american_porter', 'american_stout',
  'imperial_stout', 'belgian_blonde', 'belgian_dubbel', 'belgian_tripel', 'saison',
  'witbier', 'berliner_weisse', 'gose', 'flanders_red', 'fruit_beer', 'wood_aged_beer',
  'wiener_lager', 'maerzen', 'zwickl', 'kolsch', 'altbier', 'hefeweizen', 'dunkelweizen',
  'weizenbock', 'rauchbier', 'polish_pilsner', 'kozlak', 'grodziskie', 'slovak_pale_lager',
  'slovak_amber_lager', 'baltic_porter', 'russian_imperial_stout', 'austrian_märzen_export',
  'czech_session_ipa', 'czech_new_wave_ipa', 'moravian_amber_ale',
]

export async function POST(request: NextRequest) {
  let beerName: string
  try {
    const body = await request.json()
    beerName = typeof body?.beerName === 'string' ? body.beerName.trim() : ''
  } catch {
    return NextResponse.json({ error: 'Chybný vstup' }, { status: 400 })
  }

  if (!beerName) {
    return NextResponse.json({ error: 'Název piva je povinný' }, { status: 400 })
  }

  const prompt = `Znáš konkrétní pivo nebo pivní značku nazvanou "${beerName}"?

Vrať POUZE validní JSON objekt (bez markdown, bez komentářů) v tomto formátu:
{
  "name": "zobrazovaný název piva nebo stylu",
  "abv": číslo nebo null,
  "brewery": "pivovar nebo null",
  "description": "krátký popis česky, max 2 věty",
  "styleId": "nejbližší klíč ze seznamu níže nebo null"
}

Pravidla:
- Pokud nevíš ABV s jistotou → abv: null
- Pokud nevíš pivovar s jistotou → brewery: null
- NIKDY nevymýšlej fakta
- description vždy česky
- styleId vyber z: ${STYLE_KEYS.join(', ')}`

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Chybí API klíč' }, { status: 500 })
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const cleaned = text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(cleaned)

    const result: BeerInfoResult = {
      name: typeof parsed.name === 'string' ? parsed.name : beerName,
      styleId: typeof parsed.styleId === 'string' ? parsed.styleId : undefined,
      abv: typeof parsed.abv === 'number' ? parsed.abv : null,
      brewery: typeof parsed.brewery === 'string' ? parsed.brewery : null,
      description: typeof parsed.description === 'string' ? parsed.description : '',
      source: 'ai',
    }

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Nepodařilo se načíst informace o pivu' }, { status: 500 })
  }
}

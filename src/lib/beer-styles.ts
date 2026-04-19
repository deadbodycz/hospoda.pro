import stylesRaw from './beer-styles.json'

export interface BeerStyle {
  name_cz: string
  name_en: string
  abv_range: string
  ibu_range: string
  color_srm: string
  color_cz: string
  description_cz: string
  food_pairing_cz: string
  notes: string
}

const styles = stylesRaw as Record<string, BeerStyle>

// Standard SRM → hex color mapping (ASBC/EBC approximation)
const SRM_TABLE: [number, string][] = [
  [1, '#FFE699'], [2, '#FFD878'], [3, '#FFCA5A'], [4, '#FFBF42'],
  [5, '#FBB123'], [6, '#F8A600'], [7, '#F39C00'], [8, '#EA8F00'],
  [9, '#E58500'], [10, '#DE7A00'], [12, '#CF6900'], [14, '#C35900'],
  [16, '#B54C00'], [18, '#A83E00'], [20, '#9B3200'], [22, '#8E2900'],
  [25, '#7B1A00'], [28, '#6A0F00'], [30, '#5E0800'], [35, '#3A0400'],
  [40, '#1E0500'],
]

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [r, g, b]
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
}

export function srmToHex(srm: number): string {
  if (!isFinite(srm) || srm <= 0) return '#888888'
  const clamped = Math.min(srm, 40)
  for (let i = 0; i < SRM_TABLE.length - 1; i++) {
    const [s0, c0] = SRM_TABLE[i]
    const [s1, c1] = SRM_TABLE[i + 1]
    if (clamped <= s1) {
      const t = (clamped - s0) / (s1 - s0)
      const [r0, g0, b0] = hexToRgb(c0)
      const [r1, g1, b1] = hexToRgb(c1)
      return rgbToHex(r0 + t * (r1 - r0), g0 + t * (g1 - g0), b0 + t * (b1 - b0))
    }
  }
  return SRM_TABLE[SRM_TABLE.length - 1][1]
}

export function parseSrmRange(srmStr: string): [number, number] {
  const match = srmStr.match(/(\d+(?:\.\d+)?)[^0-9]+(\d+(?:\.\d+)?)/)
  if (match) return [parseFloat(match[1]), parseFloat(match[2])]
  const single = parseFloat(srmStr)
  return isFinite(single) ? [single, single] : [0, 0]
}

export function getBeerStyleById(id: string): BeerStyle | undefined {
  return styles[id]
}

export function getAllBeerStyles(): [string, BeerStyle][] {
  return Object.entries(styles)
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

export function searchBeerStyles(query: string, threshold = 2): BeerStyle[] {
  const normalized = normalizeText(query)
  const tokens = normalized.split(' ').filter(t => t.length >= 3)
  if (tokens.length === 0) return []

  return Object.values(styles).filter(style => {
    const haystack = normalizeText(`${style.name_cz} ${style.name_en} ${style.description_cz}`)
    const words = haystack.split(' ')
    return tokens.some(token =>
      haystack.includes(token) ||
      words.some(word => word.length >= 3 && levenshtein(token, word) <= threshold)
    )
  })
}

// Keyword heuristics for common beer names/styles
const KEYWORD_MAP: [string[], string][] = [
  [['neipa', 'new england', 'hazy ipa', 'hazy'], 'new_england_ipa'],
  [['west coast ipa', 'wcipa'], 'american_ipa'],
  [['ipa', 'india pale ale', 'india pale'], 'american_ipa'],
  [['double ipa', 'imperial ipa', 'dipa'], 'imperial_ipa'],
  [['session ipa', 'czech session'], 'czech_session_ipa'],
  [['imperial stout', 'russian imperial'], 'imperial_stout'],
  [['oatmeal stout'], 'oatmeal_stout'],
  [['milk stout', 'sweet stout', 'cream stout'], 'milk_stout'],
  [['stout', 'porter'], 'american_stout'],
  [['hefeweizen', 'weizen', 'weiss', 'pšeničné', 'psenicne'], 'hefeweizen'],
  [['dunkelweizen', 'dunkel weizen', 'dark wheat'], 'dunkelweizen'],
  [['witbier', 'wit', 'belge', 'belgické pšeničné'], 'witbier'],
  [['pilsner urquell', 'urquell', 'pilsner', 'pilsen', 'pilz'], 'cz_pale_lager'],
  [['czech pale', 'svetly lezak', 'světlý ležák', 'světlé', 'svetle'], 'cz_pale_lager'],
  [['czech dark', 'tmavý ležák', 'tmave', 'dark lager'], 'czech_dark_lager'],
  [['polotmavy', 'polotmavý', 'amber lager', 'jantarove'], 'cz_amber_lager'],
  [['czech pale ale', 'čipa', 'cipa'], 'czech_pale_ale'],
  [['lager', 'ležák', 'lezak'], 'cz_pale_lager'],
  [['gose'], 'gose'],
  [['berliner', 'berliner weisse'], 'berliner_weisse'],
  [['lambic', 'gueuze', 'kriek'], 'lambic'],
  [['saison', 'farmhouse'], 'saison'],
  [['tripel', 'triple'], 'belgian_tripel'],
  [['dubbel', 'double'], 'belgian_dubbel'],
  [['golden ale', 'golden strong', 'belgian golden'], 'belgian_golden_strong'],
  [['pale ale', 'epa', 'english pale'], 'english_pale_ale'],
  [['amber ale', 'red ale', 'irish red'], 'american_amber_ale'],
  [['brown ale', 'hnědý', 'hnede'], 'english_brown_ale'],
  [['barleywine', 'barley wine'], 'american_barleywine'],
  [['schwarzbier', 'schwarz', 'black lager'], 'schwarzbier'],
  [['bock', 'doppelbock', 'maibock'], 'maibock'],
  [['märzen', 'marzen', 'oktoberfest'], 'marzen'],
  [['kolsch', 'kölsch'], 'kolsch'],
  [['altbier', 'alt'], 'altbier'],
  [['rauchbier', 'smoked', 'uzené', 'uzene'], 'rauchbier'],
  [['baltic porter', 'baltský'], 'baltic_porter'],
  [['cream ale'], 'cream_ale'],
  [['kveik', 'farmhouse lager'], 'cz_pale_lager'],
]

export function inferStyleFromBeerName(beerName: string): BeerStyle | undefined {
  return inferStyleEntryFromBeerName(beerName)?.[1]
}

export function inferStyleEntryFromBeerName(beerName: string): [string, BeerStyle] | undefined {
  const normalized = normalizeText(beerName)
  for (const [keywords, id] of KEYWORD_MAP) {
    if (keywords.some(kw => normalized.includes(normalizeText(kw)))) {
      const style = getBeerStyleById(id)
      if (style) return [id, style]
    }
  }
  const entries = Object.entries(styles)
  const norm = normalizeText(beerName)
  const tokens = norm.split(' ').filter(t => t.length >= 3)
  if (tokens.length === 0) return undefined
  for (const [id, style] of entries) {
    const haystack = normalizeText(`${style.name_cz} ${style.name_en} ${style.description_cz}`)
    const words = haystack.split(' ')
    const matches = tokens.some(token =>
      haystack.includes(token) ||
      words.some(word => word.length >= 3 && levenshtein(token, word) <= 1)
    )
    if (matches) return [id, style]
  }
  return undefined
}

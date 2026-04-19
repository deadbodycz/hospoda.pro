'use client'

import { srmToHex, parseSrmRange } from '@/lib/beer-styles'

interface SrmColorSwatchProps {
  srm: number | string
  label?: string
  size?: 'sm' | 'md'
}

export default function SrmColorSwatch({ srm, label, size = 'md' }: SrmColorSwatchProps) {
  const dim = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6'

  if (typeof srm === 'string') {
    const [min, max] = parseSrmRange(srm)
    if (min <= 0 && max <= 0) {
      return <span className={`${dim} rounded-full bg-outline inline-block flex-shrink-0`} />
    }
    const colorMin = srmToHex(min)
    const colorMax = srmToHex(max)
    const title = label ? `${label} · SRM ${min}–${max}` : `SRM ${min}–${max}`
    return (
      <span
        className={`${dim} rounded-full inline-block flex-shrink-0 border border-white/10`}
        style={{ background: `linear-gradient(135deg, ${colorMin}, ${colorMax})` }}
        title={title}
        aria-label={title}
      />
    )
  }

  if (!isFinite(srm) || srm <= 0) {
    return <span className={`${dim} rounded-full bg-outline inline-block flex-shrink-0`} />
  }

  const color = srmToHex(srm)
  const title = label ? `${label} · SRM ${srm}` : `SRM ${srm}`
  return (
    <span
      className={`${dim} rounded-full inline-block flex-shrink-0 border border-white/10`}
      style={{ backgroundColor: color }}
      title={title}
      aria-label={title}
    />
  )
}

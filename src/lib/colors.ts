/**
 * Deterministické přiřazení barvy avataru z jména uživatele.
 * Vrací Tailwind color name — třídy jsou whitelistovány v tailwind.config.js.
 */

const COLORS = [
  'amber',
  'rose',
  'sky',
  'emerald',
  'violet',
  'orange',
  'teal',
  'indigo',
  'cyan',
  'fuchsia',
] as const

type AvatarColor = (typeof COLORS)[number]

function hashString(s: string): number {
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i)
    hash |= 0 // convert to 32-bit int
  }
  return Math.abs(hash)
}

export function getAvatarColor(name: string): AvatarColor {
  return COLORS[hashString(name) % COLORS.length]
}

export interface AvatarClasses {
  bg: string
  text: string
  border: string
}

export function getAvatarClasses(colorOrName: string): AvatarClasses {
  // If colorOrName is already a known color token, use it directly
  const color = (COLORS as readonly string[]).includes(colorOrName)
    ? (colorOrName as AvatarColor)
    : getAvatarColor(colorOrName)

  return {
    bg:     `bg-${color}-500/20`,
    text:   `text-${color}-500`,
    border: `border-${color}-500/30`,
  }
}

/** Initials from a display name (max 2 chars) */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

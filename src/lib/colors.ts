/**
 * Deterministické přiřazení barvy avataru z jména uživatele.
 * Vrací CSS hodnoty pro inline style — zemité tóny laditné k olivové.
 */

export interface AvatarStyle {
  bg: string      // pro style.backgroundColor
  color: string   // pro style.color
  border: string  // pro style.borderColor
}

const AVATAR_PALETTE: AvatarStyle[] = [
  { bg: 'rgba(138,120,80,0.15)',  color: '#C4A868', border: 'rgba(138,120,80,0.3)'  }, // ochre
  { bg: 'rgba(90,130,120,0.15)', color: '#6AADA0', border: 'rgba(90,130,120,0.3)'  }, // muted teal
  { bg: 'rgba(140,100,90,0.15)', color: '#C07A6A', border: 'rgba(140,100,90,0.3)'  }, // terracotta
  { bg: 'rgba(110,95,150,0.15)', color: '#9A82C8', border: 'rgba(110,95,150,0.3)'  }, // dusty violet
  { bg: 'rgba(80,120,160,0.15)', color: '#6A9AB8', border: 'rgba(80,120,160,0.3)'  }, // slate blue
  { bg: 'rgba(150,110,70,0.15)', color: '#C89060', border: 'rgba(150,110,70,0.3)'  }, // warm sienna
]

function hashString(s: string): number {
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export function getAvatarStyle(name: string): AvatarStyle {
  return AVATAR_PALETTE[hashString(name) % AVATAR_PALETTE.length]
}

/** Initials from a display name (max 2 chars) */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

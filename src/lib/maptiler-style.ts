/**
 * Returns a MapTiler style URL for the given theme.
 * Uses MapTiler's pre-built dataviz styles (dark/light) — no custom font/sprite config needed.
 * Requires NEXT_PUBLIC_MAPTILER_KEY to be set.
 */
export function getMapStyle(theme: 'dark' | 'light', apiKey: string): string {
  if (theme === 'light') {
    return `https://api.maptiler.com/maps/dataviz/style.json?key=${apiKey}`
  }
  return `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${apiKey}`
}

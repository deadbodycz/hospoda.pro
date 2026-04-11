/**
 * Vyvolá krátkou haptickou odezvu (vibraci) na zařízeních s podporou Vibration API.
 * Tichý fallback na ostatních zařízeních.
 */
export function haptic(ms = 10): void {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(ms)
  }
}

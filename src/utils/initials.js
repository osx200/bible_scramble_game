/**
 * Privacy: individuals are only ever shown by their initials.
 * Shared by the app and the server (server/index.js, multiplayer), so a name
 * is shortened the same way wherever it comes from. Group and team names are
 * never passed through this.
 *
 *   "Kwame Mensah"        → "K.M."
 *   "kwame"               → "K."
 *   "Mary-Jane O'Neil"    → "M.O."      (one initial per word)
 *   "K.M." / "K M" / "KM" → "K.M."      (already initials: kept)
 *   "Pastor Ken A Mensah" → "P.K.A.M."  (at most 4)
 */
const MAX_INITIALS = 4

export function toInitials(raw) {
  const text = String(raw ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim()
  if (!text) return ''

  // "KM" / "KAM": a single all-capital token of 2-4 letters is already initials
  if (/^\p{Lu}{2,4}$/u.test(text)) return text.split('').join('.') + '.'

  const letters = text
    .split(/[\s.]+/) // dots split too, so "K.M." reads as two initials
    .map((word) => word.match(/[\p{L}\p{N}]/u)?.[0])
    .filter(Boolean)
    .slice(0, MAX_INITIALS)
    .map((ch) => ch.toLocaleUpperCase())

  return letters.length ? letters.join('.') + '.' : ''
}

/**
 * Client for the leaderboard API (server/index.js, proxied at /api/ by nginx
 * in production and by Vite in dev). Every call resolves — a dead server,
 * offline phone or timeout yields `{ ok: false }`, never a thrown error, so
 * the leaderboard can fail without taking a game screen down with it.
 */

const TIMEOUT_MS = 6000

export const BOARDS = {
  individual: { id: 'individual', label: 'Top Players' },
  group: { id: 'group', label: 'Top Groups' },
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

async function request(path, options = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(path, {
      ...options,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    })
    const data = await res.json().catch(() => ({}))
    return res.ok ? { ok: true, ...data } : { ok: false, error: data.error || `Error ${res.status}` }
  } catch {
    return { ok: false, error: 'Leaderboard unavailable' }
  } finally {
    clearTimeout(timer)
  }
}

/** → { ok, month, entries: [{ id, name, score, correct, total, difficulty, wordSet }] } */
export function fetchLeaderboard(board) {
  return request(`/api/leaderboard?board=${encodeURIComponent(board)}`)
}

/**
 * entry: { id, board, name, score, correct, total, difficulty, wordSet }.
 * → { ok, month, rank } — rank is 1–5 when this game made the board, else null.
 * Reusing an id is a no-op on the server, so a double submit is harmless.
 */
export function submitScore(entry) {
  return request('/api/scores', { method: 'POST', body: JSON.stringify(entry) })
}

/** "2026-10" → "October 2026" */
export function monthLabel(month) {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

/** "2026-10" → "1 Nov" — when this board starts over */
export function resetLabel(month) {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m, 1).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

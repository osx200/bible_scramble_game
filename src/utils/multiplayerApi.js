/**
 * HTTP side of "Play With Others" (server/multiplayer/http.js). Like the
 * leaderboard client, every call resolves: failures come back as
 * { ok: false, error }, never as a thrown error.
 *
 * Seats: the token the server issues on create/join. It is kept in
 * sessionStorage (this tab) with a localStorage copy keyed by room, so a
 * refresh or a closed tab can rejoin as the same player. The server always
 * checks it (by hash) — storage only remembers it.
 */

async function request(path, options = {}) {
  try {
    const res = await fetch(path, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    })
    const data = await res.json().catch(() => ({}))
    return res.ok ? { ok: true, ...data } : { ok: false, status: res.status, error: data.error || `Error ${res.status}`, roomStatus: data.status }
  } catch {
    return { ok: false, error: 'Could not reach the game server. Check your connection and try again.' }
  }
}

export const createRoom = (body) => request('/api/mp/rooms', { method: 'POST', body: JSON.stringify(body) })
export const getRoomInfo = (code) => request(`/api/mp/rooms/${encodeURIComponent(code)}`)
export const joinRoom = (code, body) => request(`/api/mp/rooms/${encodeURIComponent(code)}/join`, { method: 'POST', body: JSON.stringify(body) })
export const qrUrl = (code) => `/api/mp/qr/${encodeURIComponent(code)}`
export const inviteUrl = (code) => `${window.location.origin}/join/${code}`

const seatKey = (code) => `mp-seat:${code}`

export function saveSeat(code, seat) {
  const value = JSON.stringify(seat)
  try { sessionStorage.setItem(seatKey(code), value) } catch {}
  try { localStorage.setItem(seatKey(code), value) } catch {}
}

export function loadSeat(code) {
  for (const store of [() => sessionStorage, () => localStorage]) {
    try {
      const seat = JSON.parse(store().getItem(seatKey(code)))
      if (seat?.token) return seat
    } catch {}
  }
  return null
}

export function clearSeat(code) {
  try { sessionStorage.removeItem(seatKey(code)) } catch {}
  try { localStorage.removeItem(seatKey(code)) } catch {}
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}
